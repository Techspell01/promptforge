import type { ArchetypeRecipe } from "./types";

export const pipelineRecipe: ArchetypeRecipe = {
  archetype: "pipeline",
  engineerTitle: "data engineer",
  brief:
    "A data pipeline or batch job. Cover sources, schemas, transforms, idempotency, scheduling and data quality checks. No UI or mobile advice.",
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
  security: ["secrets", "authz", "validation", "injection", "ssrf", "logging_pii", "deps"],
  paranoidSecurity: [],
  defaults: {
    scope: [
      "- Document each source, its schema and its refresh cadence.",
      "- Transforms are idempotent: re-running a window produces identical output.",
      "- Data quality checks run before load and fail the run on violation.",
    ],
    data_model: ["- Define source, staging and output schemas with keys, types and grain."],
    acceptance_criteria: [
      "1. A full run on sample data produces the documented output tables.",
      "2. Re-running the same window does not duplicate rows.",
      "3. A malformed source record is quarantined and reported, not silently dropped.",
    ],
    tests: [
      "- Unit tests for each transform with fixture inputs.",
      "- Idempotency test: run twice, compare outputs.",
      "- Data quality test with a deliberately bad fixture.",
    ],
  },
};
