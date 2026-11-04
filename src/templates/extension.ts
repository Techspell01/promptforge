import type { ArchetypeRecipe } from "./types";

export const extensionRecipe: ArchetypeRecipe = {
  archetype: "extension",
  engineerTitle: "browser extension engineer",
  brief:
    "A browser extension (Manifest V3). Cover manifest permissions, content scripts, service worker and messaging. No mobile or server-deployment advice.",
  sections: [
    "role",
    "goal",
    "scope",
    "non_goals",
    "stack",
    "acceptance_criteria",
    "security",
    "code_quality",
    "tests",
    "workflow",
    "done",
    "anti_patterns",
    "open_questions",
  ],
  security: ["secrets", "validation", "injection", "xss", "logging_pii", "deps", "headers"],
  paranoidSecurity: ["authz"],
  defaults: {
    scope: [
      "- Manifest V3 with the minimum permissions and host permissions the features need.",
      "- Content scripts never trust page data; validate every message between contexts.",
      "- No remote code; all scripts ship in the package.",
    ],
    acceptance_criteria: [
      "1. The extension loads unpacked without manifest warnings.",
      "2. The manifest requests no permission that no feature uses.",
      "3. Page content is inserted as text, never as HTML.",
    ],
    tests: [
      "- Unit tests for message validation and core logic.",
      "- One end-to-end test loading the unpacked extension in a headless browser.",
    ],
  },
};
