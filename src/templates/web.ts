import type { ArchetypeRecipe } from "./types";

export const webRecipe: ArchetypeRecipe = {
  archetype: "web",
  engineerTitle: "web application engineer",
  brief:
    "A browser-based web app. Cover routing, server/client boundaries, forms and accessibility. No native mobile or CLI advice.",
  sections: [
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
  ],
  security: [
    "secrets",
    "authn",
    "authz",
    "validation",
    "injection",
    "rate_limits",
    "xss",
    "logging_pii",
    "deps",
    "headers",
  ],
  paranoidSecurity: ["ssrf"],
  defaults: {
    scope: [
      "- Implement the core user flow described in GOAL end to end.",
      "- Responsive layout: one column on mobile, wider layout on desktop.",
      "- Keyboard accessible; visible focus states; WCAG AA contrast.",
    ],
    data_model: [
      "- Define each table or collection with field names, types, ownership column and indexes before writing UI.",
    ],
    acceptance_criteria: [
      "1. A new user completes the core flow from GOAL without errors.",
      "2. Invalid input shows a field-level message and is rejected server-side.",
      "3. A user cannot read or change another user's data (verified by test).",
      "4. Pages pass an automated accessibility check with no serious violations.",
    ],
    tests: [
      "- Unit tests for validation and domain logic.",
      "- Integration test for authorization isolation between two users.",
      "- One end-to-end test of the core flow. One command runs all tests.",
    ],
  },
};
