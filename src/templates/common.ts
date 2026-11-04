import type { SectionId } from "@/features/skeleton/sections";

/** Defaults shared by every archetype; a recipe's own defaults override these per section. */
export const COMMON_DEFAULTS: Readonly<Partial<Record<SectionId, readonly string[]>>> = {
  non_goals: ["- Billing, teams and social features.", "- Any feature not listed in SCOPE."],
  stack: [
    "- Use the stack named in the brief. Verify current package names and APIs in official docs before use.",
  ],
  code_quality: [
    "- Strict typing; no `any` or unjustified suppressions.",
    "- One job per function; full-word names; comments explain why, not what.",
    "- One Result/error type; no silent catches.",
    "- Formatter, linter and type checker clean.",
  ],
  workflow: [
    "1. Plan: file tree, confirmed dependency versions, blocking questions. STOP.",
    "2. Core data and domain logic with tests. STOP.",
    "3. User-facing flow with tests. STOP.",
    "4. Security pass, lint, typecheck, tests; report residual risks. STOP.",
  ],
  done: [
    "- Fresh clone, install, env, run: works with zero manual fixes.",
    "- All acceptance criteria demonstrated; tests, lint and typecheck clean.",
    "- No high or critical dependency audit findings.",
  ],
  anti_patterns: [
    "- Inventing libraries or APIs instead of checking docs.",
    "- Catching errors without handling or reporting them.",
    "- Premature abstraction and speculative configuration.",
  ],
};
