import { canonicalOrder, SECTION_TITLES, type Section } from "./sections";

/** Headers come only from code. Numbering follows emitted sections so the prompt always reads 1..n. */
export function renderPrompt(sections: readonly Section[]): string {
  return canonicalOrder(sections.filter((section) => section.enabled))
    .map((section, index) => `## ${index + 1} ${SECTION_TITLES[section.id]}\n${section.content.trim()}`)
    .join("\n\n");
}

export function deriveTitle(idea: string): string {
  const flat = idea.replace(/\s+/g, " ").trim();
  if (flat.length <= 60) return flat;
  const cut = flat.slice(0, 60);
  const lastSpace = cut.lastIndexOf(" ");
  return `${(lastSpace > 30 ? cut.slice(0, lastSpace) : cut).trimEnd()}...`;
}
