import "server-only";
import { scorePrompt, type ScoreResult } from "@/features/score/scorer";
import { BUDGET_RANGES, type Settings } from "@/features/settings/settings.schema";
import { renderPrompt } from "@/features/skeleton/render";
import { sanitizeSectionContent } from "@/features/skeleton/sanitize";
import { canonicalOrder, type Section } from "@/features/skeleton/sections";
import { recipeFor } from "@/templates";
import { countTokens } from "./tokenizer";

export interface Analysis {
  readonly sections: Section[];
  readonly text: string;
  readonly tokenCount: number;
  readonly budget: { readonly min: number; readonly max: number };
  readonly score: ScoreResult;
}

/** Server-authoritative recount and rescore for edited sections. Sections outside the archetype whitelist are dropped. */
export function analyzeSections(sections: readonly Section[], settings: Settings): Analysis {
  const allowed = new Set(recipeFor(settings.archetype).sections);
  const cleaned = canonicalOrder(
    sections
      .filter((section) => allowed.has(section.id))
      .map((section) => ({ ...section, content: sanitizeSectionContent(section.content) })),
  );
  const text = renderPrompt(cleaned);
  const tokenCount = countTokens(text);
  const budget = BUDGET_RANGES[settings.budget];
  return {
    sections: cleaned,
    text,
    tokenCount,
    budget,
    score: scorePrompt({ sections: cleaned, tokenCount, budget }),
  };
}
