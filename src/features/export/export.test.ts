// Threat: exported files carrying hidden control or bidi characters into another tool.
import { describe, expect, it } from "vitest";
import { exportFileName, formatForExport, sanitizeForExport } from "./export";

describe("export", () => {
  it("strips control and bidi characters and normalises line endings", () => {
    expect(sanitizeForExport("## 1 ROLE\r\nBuild\u0000 it\u202E now\u0007")).toBe(
      "## 1 ROLE\nBuild it now\n",
    );
  });

  it("keeps headers in markdown and flattens them in plain text", () => {
    const text = "## 1 ROLE\nSenior engineer.";
    expect(formatForExport(text, "md")).toBe("## 1 ROLE\nSenior engineer.\n");
    expect(formatForExport(text, "txt")).toBe("1 ROLE\nSenior engineer.\n");
  });

  it("builds a safe file name with no path characters", () => {
    expect(exportFileName("../../etc/passwd <script>", "md")).toBe("etc-passwd-script.md");
    expect(exportFileName("!!!", "txt")).toBe("prompt.txt");
  });
});
