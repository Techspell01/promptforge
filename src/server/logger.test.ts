// Threat: secrets or personal data written to logs.
import { describe, expect, it } from "vitest";
import { redact } from "./logger";

describe("log redaction", () => {
  it("redacts sensitive field names entirely", () => {
    expect(redact({ idea: "my secret startup", apiKey: "x", email: "a@b.co", route: "generate" })).toEqual({
      idea: "[redacted]",
      apiKey: "[redacted]",
      email: "[redacted]",
      route: "generate",
    });
  });

  it("redacts key and token patterns inside free text", () => {
    const message =
      "failed for harry@example.com with gsk_abcdefghijklmnop and eyJhbGciOiJIUzI1.eyJzdWIiOiIxMjM0NTY3ODkw.abcdefghijklmnop";
    const output = redact(message) as string;
    expect(output).not.toContain("harry@example.com");
    expect(output).not.toContain("gsk_abcdefghijklmnop");
    expect(output).not.toContain("eyJhbGciOiJIUzI1");
  });

  it("reduces errors to name and redacted message, dropping stacks", () => {
    const output = redact(new Error("bad key AIzaSyA1234567890abcdefghijklmnop")) as Record<string, unknown>;
    expect(output).toEqual({ name: "Error", message: "bad key [redacted]" });
  });
});
