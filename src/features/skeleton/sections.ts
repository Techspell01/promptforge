/** Fixed section order. Code owns ids, order and headers; the model only supplies content. */
export const SECTION_IDS = [
  "role",
  "goal",
  "scope",
  "non_goals",
  "stack",
  "data_model",
  "acceptance_criteria",
  "security",
  "code_quality",
  "tests",
  "workflow",
  "done",
  "anti_patterns",
  "open_questions",
] as const;

export type SectionId = (typeof SECTION_IDS)[number];

export const SECTION_TITLES: Readonly<Record<SectionId, string>> = {
  role: "ROLE",
  goal: "GOAL",
  scope: "SCOPE",
  non_goals: "NON-GOALS",
  stack: "STACK",
  data_model: "DATA MODEL",
  acceptance_criteria: "ACCEPTANCE CRITERIA",
  security: "SECURITY",
  code_quality: "CODE QUALITY",
  tests: "TESTS",
  workflow: "WORKFLOW",
  done: "DONE",
  anti_patterns: "ANTI-PATTERNS",
  open_questions: "OPEN QUESTIONS",
};

/** Never dropped by the pruner and never disabled in the editor. */
export const PROTECTED_SECTIONS: ReadonlySet<SectionId> = new Set<SectionId>([
  "security",
  "acceptance_criteria",
]);

export interface Section {
  readonly id: SectionId;
  readonly content: string;
  readonly enabled: boolean;
}

export function isSectionId(value: string): value is SectionId {
  return (SECTION_IDS as readonly string[]).includes(value);
}

export function sectionOrder(id: SectionId): number {
  return SECTION_IDS.indexOf(id);
}

/** Returns sections sorted into the canonical order, keeping the first occurrence of each id. */
export function canonicalOrder(sections: readonly Section[]): Section[] {
  const seen = new Set<SectionId>();
  const unique = sections.filter((section) => {
    if (seen.has(section.id)) return false;
    seen.add(section.id);
    return true;
  });
  return unique.sort((left, right) => sectionOrder(left.id) - sectionOrder(right.id));
}
