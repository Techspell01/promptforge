// Threat: oversized or control-character input reaching storage or the model.
import { describe, expect, it } from "vitest";
import { IDEA_MAX_CHARACTERS, ideaSchema } from "./idea.schema";

describe("idea validation", () => {
  it("accepts and trims a normal idea", () => {
    expect(ideaSchema.parse("  A todo app for families  ")).toBe("A todo app for families");
  });

  it("accepts newlines and tabs", () => {
    expect(ideaSchema.safeParse("Line one\n\tLine two\r\nLine three").success).toBe(true);
  });

  it.each([
    ["empty", ""],
    ["whitespace only", "   \n  "],
    ["null byte", "todo\u0000app"],
    ["escape sequence", "todo \u001b[31m app"],
    ["bidi override", "todo \u202E ppa"],
    ["oversized", "a".repeat(IDEA_MAX_CHARACTERS + 1)],
  ])("rejects %s", (_label, input) => {
    expect(ideaSchema.safeParse(input).success).toBe(false);
  });

  it("accepts exactly the maximum length", () => {
    expect(ideaSchema.safeParse("a".repeat(IDEA_MAX_CHARACTERS)).success).toBe(true);
  });
});
