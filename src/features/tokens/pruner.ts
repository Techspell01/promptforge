import { renderPrompt } from "@/features/skeleton/render";
import { PROTECTED_SECTIONS, type Section, type SectionId } from "@/features/skeleton/sections";

export interface Removal {
  readonly step: "drop_anti_patterns" | "merge_data_model" | "compress_tests" | "compress_code_quality";
  readonly section: SectionId;
  readonly description: string;
  readonly removedText: string;
  readonly tokensSaved: number;
}

export interface PruneResult {
  readonly sections: Section[];
  readonly removed: Removal[];
  readonly tokenCount: number;
  readonly withinBudget: boolean;
}

type Counter = (text: string) => number;

const COMPRESSED_TESTS_LINES = 4;
const COMPRESSED_CODE_QUALITY_LINES = 3;

function replaceSection(sections: readonly Section[], id: SectionId, content: string): Section[] {
  return sections.map((section) => (section.id === id ? { ...section, content } : section));
}

function findEnabled(sections: readonly Section[], id: SectionId): Section | undefined {
  return sections.find((section) => section.id === id && section.enabled);
}

/** Keeps top-level items and drops nested detail first, then trailing items. Whole lines only, never mid-line cuts. */
function compressLines(content: string, keep: number): { kept: string; dropped: string } {
  const lines = content.split("\n").filter((line) => line.trim().length > 0);
  const topLevel = lines.filter((line) => !/^\s{2,}/.test(line));
  const kept = topLevel.slice(0, keep);
  const dropped = lines.filter((line) => !kept.includes(line));
  return { kept: kept.join("\n"), dropped: dropped.join("\n") };
}

type Step = (
  sections: readonly Section[],
) => { sections: Section[]; removal: Omit<Removal, "tokensSaved"> } | undefined;

const PRUNE_STEPS: readonly Step[] = [
  (sections) => {
    const target = findEnabled(sections, "anti_patterns");
    if (!target) return undefined;
    return {
      sections: sections.filter((section) => section.id !== "anti_patterns"),
      removal: {
        step: "drop_anti_patterns",
        section: "anti_patterns",
        description: "Dropped ANTI-PATTERNS",
        removedText: target.content,
      },
    };
  },
  (sections) => {
    const dataModel = findEnabled(sections, "data_model");
    const scope = findEnabled(sections, "scope");
    if (!dataModel || !scope) return undefined;
    const merged = `${scope.content}\n- Data model: ${dataModel.content.replace(/^- /gm, "").replace(/\n+/g, "; ")}`;
    return {
      sections: replaceSection(
        sections.filter((section) => section.id !== "data_model"),
        "scope",
        merged,
      ),
      removal: {
        step: "merge_data_model",
        section: "data_model",
        description: "Merged DATA MODEL into SCOPE",
        removedText: "## DATA MODEL header",
      },
    };
  },
  (sections) => compressStep(sections, "tests", COMPRESSED_TESTS_LINES, "compress_tests", "Compressed TESTS"),
  (sections) =>
    compressStep(
      sections,
      "code_quality",
      COMPRESSED_CODE_QUALITY_LINES,
      "compress_code_quality",
      "Compressed CODE QUALITY",
    ),
];

function compressStep(
  sections: readonly Section[],
  id: SectionId,
  keep: number,
  step: Removal["step"],
  description: string,
): ReturnType<Step> {
  const target = findEnabled(sections, id);
  if (!target) return undefined;
  const { kept, dropped } = compressLines(target.content, keep);
  if (dropped.length === 0) return undefined;
  return {
    sections: replaceSection(sections, id, kept),
    removal: { step, section: id, description, removedText: dropped },
  };
}

/**
 * Applies the fixed prune order until the prompt fits. SECURITY and ACCEPTANCE CRITERIA are never touched.
 * If the prompt still does not fit, it is returned over budget rather than truncated.
 */
export function pruneToBudget(sections: readonly Section[], maxTokens: number, count: Counter): PruneResult {
  let current = [...sections];
  let tokenCount = count(renderPrompt(current));
  const removed: Removal[] = [];

  for (const step of PRUNE_STEPS) {
    if (tokenCount <= maxTokens) break;
    const outcome = step(current);
    if (!outcome) continue;
    const protectedChanged = outcome.sections.some((section) => {
      if (!PROTECTED_SECTIONS.has(section.id)) return false;
      return current.find((previous) => previous.id === section.id)?.content !== section.content;
    });
    if (protectedChanged) throw new Error("Prune step modified a protected section.");
    const nextCount = count(renderPrompt(outcome.sections));
    removed.push({ ...outcome.removal, tokensSaved: Math.max(0, tokenCount - nextCount) });
    current = outcome.sections;
    tokenCount = nextCount;
  }

  return { sections: current, removed, tokenCount, withinBudget: tokenCount <= maxTokens };
}
