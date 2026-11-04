import type { Section, SectionId } from "@/features/skeleton/sections";
import { findVagueTerms } from "./vague-verbs";

export interface ScoreReason {
  readonly label: string;
  readonly points: number;
  readonly maxPoints: number;
  readonly detail: string;
}

export interface ScoreResult {
  readonly score: number;
  readonly reasons: ScoreReason[];
}

export interface ScoreInput {
  readonly sections: readonly Section[];
  readonly tokenCount: number;
  readonly budget: { readonly min: number; readonly max: number };
}

function contentOf(sections: readonly Section[], id: SectionId): string {
  return sections.find((section) => section.id === id && section.enabled)?.content.trim() ?? "";
}

function countItems(content: string): number {
  return content.split("\n").filter((line) => /^\s*(-|\*|\d+[.)])\s+\S/.test(line)).length;
}

function scoreCriteria(sections: readonly Section[]): ScoreReason {
  const numbered = contentOf(sections, "acceptance_criteria")
    .split("\n")
    .filter((line) => /^\s*\d+[.)]\s+\S/.test(line)).length;
  const points = numbered >= 3 ? 25 : numbered > 0 ? 12 : 0;
  return {
    label: "Acceptance criteria",
    points,
    maxPoints: 25,
    detail: `${numbered} numbered criteria (3+ for full points)`,
  };
}

function scorePresence(
  sections: readonly Section[],
  id: SectionId,
  label: string,
  maxPoints: number,
  minItems: number,
): ScoreReason {
  const items = countItems(contentOf(sections, id));
  const points = items >= minItems ? maxPoints : items > 0 ? Math.round(maxPoints / 2) : 0;
  return { label, points, maxPoints, detail: items === 0 ? "missing" : `${items} item(s)` };
}

function scoreBudget(tokenCount: number, budget: ScoreInput["budget"]): ScoreReason {
  const maxPoints = 15;
  if (tokenCount <= budget.max && tokenCount >= budget.min) {
    return {
      label: "Within budget",
      points: maxPoints,
      maxPoints,
      detail: `${tokenCount} tokens in ${budget.min}-${budget.max}`,
    };
  }
  if (tokenCount < budget.min) {
    return {
      label: "Within budget",
      points: 10,
      maxPoints,
      detail: `${tokenCount} tokens, under the ${budget.min} minimum`,
    };
  }
  const overRatio = (tokenCount - budget.max) / budget.max;
  return {
    label: "Within budget",
    points: overRatio <= 0.1 ? 7 : 0,
    maxPoints,
    detail: `${tokenCount} tokens, ${Math.round(overRatio * 100)}% over ${budget.max}`,
  };
}

function scoreVagueness(sections: readonly Section[]): ScoreReason {
  const maxPoints = 15;
  const text = sections
    .filter((section) => section.enabled && section.id !== "anti_patterns")
    .map((section) => section.content)
    .join("\n");
  const hits = findVagueTerms(text);
  const unique = [...new Set(hits)];
  return {
    label: "No vague verbs",
    points: Math.max(0, maxPoints - hits.length * 5),
    maxPoints,
    detail: hits.length === 0 ? "none found" : `found: ${unique.join(", ")}`,
  };
}

/** Deterministic, explainable rubric. A model never decides the score. */
export function scorePrompt(input: ScoreInput): ScoreResult {
  const reasons: ScoreReason[] = [
    scoreCriteria(input.sections),
    scorePresence(input.sections, "security", "Security checklist", 20, 3),
    scorePresence(input.sections, "tests", "Tests", 15, 2),
    scorePresence(input.sections, "non_goals", "Non-goals", 10, 1),
    scoreBudget(input.tokenCount, input.budget),
    scoreVagueness(input.sections),
  ];
  const score = reasons.reduce((total, reason) => total + reason.points, 0);
  return { score: Math.min(100, Math.max(0, score)), reasons };
}
