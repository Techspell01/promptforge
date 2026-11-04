import { QUESTIONS, type ClarifyAnswers, type ClarifyTopic } from "@/features/clarify/taxonomy";
import { PLATFORM_LABELS, type Settings } from "@/features/settings/settings.schema";
import { COMMON_DEFAULTS } from "@/templates/common";
import { recipeFor, type ArchetypeRecipe } from "@/templates";
import { renderSecurityChecklist } from "@/templates/security-checklist";
import { sanitizeSectionContent, stripControlCharacters } from "./sanitize";
import type { Section, SectionId } from "./sections";

export interface SkeletonInput {
  readonly idea: string;
  readonly settings: Settings;
  readonly answers: ClarifyAnswers;
  readonly unresolved: readonly ClarifyTopic[];
}

export type ModelContent = Readonly<Partial<Record<SectionId, string>>>;

const MAX_EXTRA_SECURITY_LINES = 4;

function flattenIdea(idea: string): string {
  return sanitizeSectionContent(stripControlCharacters(idea).replace(/\s+/g, " "));
}

function securityItems(recipe: ArchetypeRecipe, settings: Settings) {
  return settings.securityLevel === "paranoid"
    ? [...recipe.security, ...recipe.paranoidSecurity]
    : recipe.security;
}

function decisionLines(answers: ClarifyAnswers): string[] {
  return Object.entries(answers).map(
    ([topic, answer]) => `- Decision (${topic}): ${sanitizeSectionContent(answer)}.`,
  );
}

function defaultLines(recipe: ArchetypeRecipe, id: SectionId): readonly string[] {
  return recipe.defaults[id] ?? COMMON_DEFAULTS[id] ?? [];
}

/** Code-owned content for every section. Model content (when present) replaces the defaults section by section. */
function deterministicContent(recipe: ArchetypeRecipe, input: SkeletonInput, id: SectionId): string {
  const { settings } = input;
  switch (id) {
    case "role":
      return `Senior ${recipe.engineerTitle}. Production-grade, readable code. Verify package names and APIs in current docs before use. Boring over clever.`;
    case "goal":
      return `- Build: ${flattenIdea(input.idea)}\n- Platform: ${PLATFORM_LABELS[settings.platform]}.`;
    case "scope":
      return [...defaultLines(recipe, id), ...decisionLines(input.answers)].join("\n");
    case "stack":
      return settings.stack
        ? `- ${sanitizeSectionContent(settings.stack)}. Verify current versions in official docs before use.`
        : defaultLines(recipe, id).join("\n");
    case "security":
      return renderSecurityChecklist(securityItems(recipe, settings), settings.securityLevel).join("\n");
    case "open_questions":
      return input.unresolved.length === 0
        ? "- None blocking."
        : input.unresolved
            .map((topic) => `- ${QUESTIONS[topic].question} (blocking: decide before phase 1)`)
            .join("\n");
    default:
      return defaultLines(recipe, id).join("\n");
  }
}

function mergeSecurity(codeOwned: string, modelExtra: string | undefined): string {
  if (!modelExtra) return codeOwned;
  const extraLines = sanitizeSectionContent(modelExtra)
    .split("\n")
    .map((line) => line.trim())
    .filter((line) => line.length > 0)
    .map((line) => (line.startsWith("- ") ? line : `- ${line.replace(/^[-*\d.)\s]+/, "")}`))
    .slice(0, MAX_EXTRA_SECURITY_LINES);
  return [codeOwned, ...extraLines].join("\n");
}

/**
 * Builds the final section list in the recipe's whitelist and canonical order.
 * ROLE and the SECURITY checklist are always code-owned; the model can only add project-specific security lines.
 */
export function assembleSections(input: SkeletonInput, modelContent: ModelContent = {}): Section[] {
  const recipe = recipeFor(input.settings.archetype);
  return recipe.sections.map((id) => {
    const codeOwned = deterministicContent(recipe, input, id);
    const fromModel = modelContent[id] ? sanitizeSectionContent(modelContent[id]) : "";
    let content: string;
    if (id === "role") content = codeOwned;
    else if (id === "security") content = mergeSecurity(codeOwned, fromModel);
    else if (id === "scope" && fromModel) content = [fromModel, ...decisionLines(input.answers)].join("\n");
    else content = fromModel || codeOwned;
    return { id, content, enabled: true };
  });
}

/** The deterministic fallback: what the user gets when every model fails. */
export function buildSkeleton(input: SkeletonInput): Section[] {
  return assembleSections(input, {});
}
