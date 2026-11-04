import type { ArchetypeRecipe } from "./types";

export const apiRecipe: ArchetypeRecipe = {
  archetype: "api",
  engineerTitle: "backend engineer",
  brief:
    "An HTTP API or backend service. Cover endpoints, contracts, status codes, persistence and observability. No UI or mobile advice.",
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
    "ssrf",
    "logging_pii",
    "deps",
    "headers",
  ],
  paranoidSecurity: [],
  defaults: {
    scope: [
      "- List every endpoint as METHOD /path -> request schema -> response schema -> status codes.",
      "- Consistent error envelope: { error: { code, message } }.",
      "- Health endpoint for uptime checks.",
    ],
    data_model: [
      "- Define each table with columns, types, constraints, indexes and the owning user or tenant column.",
    ],
    acceptance_criteria: [
      "1. Every endpoint validates input and returns 400 with a field error for invalid payloads.",
      "2. Requests without valid credentials return 401; cross-tenant access returns 404.",
      "3. Exceeding the rate limit returns 429 with Retry-After.",
      "4. An OpenAPI or equivalent contract matches the implemented responses.",
    ],
    tests: [
      "- Contract tests per endpoint: success, invalid input, unauthorized.",
      "- Tenant isolation test against a real database.",
      "- Rate-limit test asserting 429 and Retry-After.",
    ],
  },
};
