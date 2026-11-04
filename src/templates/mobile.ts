import type { ArchetypeRecipe } from "./types";

export const mobileRecipe: ArchetypeRecipe = {
  archetype: "mobile",
  engineerTitle: "mobile application engineer",
  brief:
    "A mobile app. Cover screens, navigation, offline behaviour, permissions and release builds. Keys stay on a backend proxy, never in the app binary.",
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
  security: ["secrets", "authn", "authz", "validation", "injection", "rate_limits", "logging_pii", "deps"],
  paranoidSecurity: ["xss"],
  defaults: {
    scope: [
      "- List each screen with its purpose and navigation entry point.",
      "- Request only the permissions the features need, at the moment they are needed.",
      "- All third-party API calls go through your backend; the app ships no API keys.",
    ],
    data_model: [
      "- Define local storage entities and server entities separately; state which sync and how conflicts resolve.",
    ],
    acceptance_criteria: [
      "1. The core flow works on a physical device in a release build.",
      "2. The app binary contains no API keys (verified by inspecting the build).",
      "3. Network calls use TLS only; cleartext traffic is disabled.",
      "4. Denying a permission degrades the feature gracefully without a crash.",
    ],
    tests: [
      "- Unit tests for domain logic and storage.",
      "- One UI test of the core flow on an emulator.",
      "- Release-build check: no debug flags, no cleartext, no keys.",
    ],
  },
};
