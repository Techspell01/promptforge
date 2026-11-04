import { describe, expect, it } from "vitest";
import { buildSkeleton } from "@/features/skeleton/build";
import { renderPrompt } from "@/features/skeleton/render";
import type { Section } from "@/features/skeleton/sections";
import { DEFAULT_SETTINGS } from "@/features/settings/settings.schema";
import { pruneToBudget } from "./pruner";
import { countTokens } from "./tokenizer";

function longSkeleton(): Section[] {
  const base = buildSkeleton({
    idea: "An inventory app for a small shop.",
    settings: DEFAULT_SETTINGS,
    answers: {},
    unresolved: [],
  });
  const padding = (label: string) =>
    Array.from(
      { length: 12 },
      (_, index) => `- ${label} item ${index}: write a precise, verifiable instruction here.`,
    ).join("\n");
  return base.map((section) =>
    ["tests", "code_quality", "anti_patterns", "data_model"].includes(section.id)
      ? { ...section, content: `${section.content}\n${padding(section.id)}\n  - nested detail line` }
      : section,
  );
}

describe("tokenizer", () => {
  it("counts real tokens, not characters", () => {
    expect(countTokens("")).toBe(0);
    expect(countTokens("hello world")).toBe(2);
  });
});

describe("pruner", () => {
  it("does nothing when already within budget", () => {
    const sections = longSkeleton();
    const result = pruneToBudget(sections, 100_000, countTokens);
    expect(result.removed).toEqual([]);
    expect(result.sections).toEqual(sections);
  });

  it("applies steps in the fixed order and reports each removal", () => {
    const result = pruneToBudget(longSkeleton(), 10, countTokens);
    expect(result.removed.map((removal) => removal.step)).toEqual([
      "drop_anti_patterns",
      "merge_data_model",
      "compress_tests",
      "compress_code_quality",
    ]);
    for (const removal of result.removed) {
      expect(removal.removedText.length).toBeGreaterThan(0);
      expect(removal.tokensSaved).toBeGreaterThanOrEqual(0);
    }
  });

  it("stops as soon as the prompt fits", () => {
    const sections = longSkeleton();
    const full = countTokens(renderPrompt(sections));
    const withoutAntiPatterns = countTokens(
      renderPrompt(sections.filter((section) => section.id !== "anti_patterns")),
    );
    const result = pruneToBudget(sections, Math.floor((full + withoutAntiPatterns) / 2), countTokens);
    expect(result.removed.map((removal) => removal.step)).toEqual(["drop_anti_patterns"]);
    expect(result.withinBudget).toBe(true);
  });

  it("never drops or edits SECURITY or ACCEPTANCE CRITERIA, even when still over budget", () => {
    const sections = longSkeleton();
    const result = pruneToBudget(sections, 10, countTokens);
    for (const id of ["security", "acceptance_criteria"] as const) {
      expect(result.sections.find((section) => section.id === id)).toEqual(
        sections.find((section) => section.id === id),
      );
    }
    expect(result.withinBudget).toBe(false);
  });

  it("never truncates mid-line", () => {
    const result = pruneToBudget(longSkeleton(), 10, countTokens);
    const original = renderPrompt(longSkeleton()).split("\n");
    for (const line of renderPrompt(result.sections).split("\n")) {
      if (line.startsWith("## ") || line.startsWith("- Data model:") || line.length === 0) continue;
      expect(original).toContain(line);
    }
  });

  it("merges DATA MODEL into SCOPE rather than dropping it", () => {
    const result = pruneToBudget(longSkeleton(), 10, countTokens);
    expect(result.sections.some((section) => section.id === "data_model")).toBe(false);
    expect(result.sections.find((section) => section.id === "scope")?.content).toContain("Data model:");
  });
});
