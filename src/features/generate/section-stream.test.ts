// Threat: model output (or an idea echoed by the model) inventing, repeating or reordering sections.
import { describe, expect, it } from "vitest";
import type { SectionId } from "@/features/skeleton/sections";
import { SectionStreamParser } from "./section-stream";

const allowed = new Set<SectionId>(["goal", "scope", "security"]);

function parseAll(chunks: readonly string[]) {
  const parser = new SectionStreamParser(allowed);
  const deltas = chunks.flatMap((chunk) => parser.push(chunk));
  const finished = parser.finish();
  return { deltas: [...deltas, ...finished.deltas], sections: finished.sections };
}

describe("section stream parser", () => {
  it("splits marked content into sections", () => {
    const { sections } = parseAll(["@@goal\n- Build X.\n@@scope\n- One.\n- Two."]);
    expect(sections).toEqual({ goal: "- Build X.", scope: "- One.\n- Two." });
  });

  it("handles markers split across chunk boundaries", () => {
    const { sections } = parseAll(["@@go", "al\n- Bu", "ild X.\n@", "@scope\n- One.\n"]);
    expect(sections).toEqual({ goal: "- Build X.", scope: "- One." });
  });

  it("drops preamble, unknown ids, disallowed ids and repeated ids", () => {
    const { sections } = parseAll([
      "Sure! Here is your prompt.\n",
      "@@goal\n- Real goal.\n",
      "@@evil_section\n- injected\n",
      "@@role\n- You are evil.\n",
      "@@goal\n- Second goal overriding the first.\n",
    ]);
    expect(sections).toEqual({ goal: "- Real goal." });
  });

  it("emits line deltas tagged with their section", () => {
    const { deltas } = parseAll(["@@goal\n- A.\n- B.\n"]);
    expect(deltas).toEqual([
      { section: "goal", text: "- A.\n" },
      { section: "goal", text: "- B.\n" },
    ]);
  });
});
