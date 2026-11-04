/** Words that tell a coding agent nothing verifiable. Each occurrence costs points. */
export const VAGUE_TERMS: readonly string[] = [
  "improve",
  "improves",
  "improved",
  "optimize",
  "optimise",
  "optimized",
  "modern",
  "enhance",
  "enhanced",
  "robust",
  "seamless",
  "seamlessly",
  "user-friendly",
  "intuitive",
  "best practices",
  "cutting-edge",
  "state-of-the-art",
  "leverage",
  "scalable",
  "etc",
  "and so on",
  "as needed",
  "if possible",
];

const VAGUE_PATTERN = new RegExp(
  `\\b(${VAGUE_TERMS.map((term) => term.replace(/[.*+?^${}()|[\]\\-]/g, "\\$&")).join("|")})\\b`,
  "gi",
);

export function findVagueTerms(text: string): string[] {
  return [...text.matchAll(VAGUE_PATTERN)].map((match) => match[0].toLowerCase());
}
