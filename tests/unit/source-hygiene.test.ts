// Threat: "Trojan Source" style invisible or bidi-override characters hiding logic in source files.
import { readdirSync, readFileSync, statSync } from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";

const root = path.resolve(import.meta.dirname, "../..");
// eslint-disable-next-line no-control-regex -- detecting control characters is the purpose
const INVISIBLE = /[\u0000-\u0008\u000B\u000C\u000E-\u001F\u200B-\u200F\u202A-\u202E\u2066-\u2069\uFEFF]/;

function files(directory: string): string[] {
  return readdirSync(directory).flatMap((entry) => {
    const full = path.join(directory, entry);
    if (statSync(full).isDirectory()) return files(full);
    return /\.(tsx?|mjs|css|sql)$/.test(entry) ? [full] : [];
  });
}

describe("source hygiene", () => {
  it("contains no literal control, invisible or bidi-override characters", () => {
    const offenders = ["src", "tests", "scripts"]
      .flatMap((directory) => files(path.join(root, directory)))
      .filter((file) => INVISIBLE.test(readFileSync(file, "utf8")));
    expect(offenders).toEqual([]);
  });
});
