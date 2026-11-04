// Shared by the idea validator, the model-output parser and export, so every boundary strips the same things.

// C0 controls except tab and newline, DEL, C1 controls, and bidi overrides that can hide text.
// eslint-disable-next-line no-control-regex -- matching control characters is the purpose
const CONTROL_CHARACTERS = /[\u0000-\u0008\u000B\u000C\u000E-\u001F\u007F-\u009F\u202A-\u202E\u2066-\u2069]/g;
// eslint-disable-next-line no-control-regex -- matching control characters is the purpose
const DISALLOWED_IN_IDEA = /[\u0000-\u0008\u000B\u000C\u000E-\u001F\u007F-\u009F\u202A-\u202E\u2066-\u2069]/;

export function containsControlCharacters(text: string): boolean {
  return DISALLOWED_IN_IDEA.test(text);
}

export function stripControlCharacters(text: string): string {
  return text.replace(/\r\n?/g, "\n").replace(CONTROL_CHARACTERS, "");
}

/**
 * Model content may not create structure: markdown headings and our section markers
 * are flattened so only code-rendered headers exist in the final prompt.
 */
export function sanitizeSectionContent(text: string, maxCharacters = 6000): string {
  const lines = stripControlCharacters(text)
    .split("\n")
    .map((line) => line.replace(/^\s{0,3}#{1,6}\s+/, "").replace(/^@@\S*\s*/, ""))
    .map((line) => line.replace(/\s+$/, ""));
  const collapsed = lines
    .join("\n")
    .replace(/\n{3,}/g, "\n\n")
    .trim();
  return collapsed.length > maxCharacters ? collapsed.slice(0, maxCharacters).trimEnd() : collapsed;
}
