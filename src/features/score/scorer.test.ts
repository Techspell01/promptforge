import { describe, expect, it } from "vitest";
import type { Section, SectionId } from "@/features/skeleton/sections";
import { scorePrompt } from "./scorer";

const budget = { min: 1200, max: 1800 };
const section = (id: SectionId, content: string): Section => ({ id, content, enabled: true });

const complete: Section[] = [
  section("goal", "- Build a recipe planner that generates a weekly shopping list."),
  section("non_goals", "- No payments.\n- No social features."),
  section(
    "acceptance_criteria",
    "1. A user adds a recipe in under 30 seconds.\n2. The list groups items by aisle.\n3. Deleting a recipe updates the list.",
  ),
  section(
    "security",
    "- Secrets: server-only.\n- Authorization: owner check on every write.\n- Validation: Zod at the boundary.",
  ),
  section("tests", "- Unit tests for list grouping.\n- Isolation test for two users."),
];

const vague: Section[] = [
  section("goal", "- Build a modern, robust, user-friendly app and optimize it."),
  section("scope", "- Improve the experience seamlessly and enhance performance etc."),
];

describe("scorer fixtures", () => {
  it("scores a complete, concrete prompt high", () => {
    const result = scorePrompt({ sections: complete, tokenCount: 1500, budget });
    expect(result.score).toBeGreaterThanOrEqual(90);
  });

  it("scores a vague prompt low", () => {
    const result = scorePrompt({ sections: vague, tokenCount: 300, budget });
    expect(result.score).toBeLessThanOrEqual(20);
    expect(result.reasons.find((reason) => reason.label === "No vague verbs")?.detail).toMatch(/modern/);
  });

  it("explains every point with a reason and sums to the score", () => {
    const result = scorePrompt({ sections: complete, tokenCount: 1500, budget });
    expect(result.reasons.reduce((total, reason) => total + reason.points, 0)).toBe(result.score);
    expect(result.reasons.reduce((total, reason) => total + reason.maxPoints, 0)).toBe(100);
  });

  it("penalises going over budget", () => {
    const within = scorePrompt({ sections: complete, tokenCount: 1500, budget }).score;
    const over = scorePrompt({ sections: complete, tokenCount: 2500, budget }).score;
    expect(over).toBeLessThan(within);
  });

  it("ignores disabled sections", () => {
    const disabled = complete.map((item) => (item.id === "security" ? { ...item, enabled: false } : item));
    expect(scorePrompt({ sections: disabled, tokenCount: 1500, budget }).score).toBeLessThan(
      scorePrompt({ sections: complete, tokenCount: 1500, budget }).score,
    );
  });
});
