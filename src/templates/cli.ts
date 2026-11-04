import type { ArchetypeRecipe } from "./types";

export const cliRecipe: ArchetypeRecipe = {
  archetype: "cli",
  engineerTitle: "command-line tool engineer",
  brief:
    "A command-line tool. Cover commands, flags, stdin/stdout, exit codes and config files. No web, UI, session-auth or mobile advice.",
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
  security: ["secrets", "validation", "injection", "logging_pii", "deps"],
  paranoidSecurity: ["ssrf"],
  defaults: {
    scope: [
      "- Document each command and flag in `--help` output.",
      "- Read from stdin and write to stdout where it makes sense; errors go to stderr.",
      "- Exit code 0 on success, non-zero with a one-line reason on failure.",
    ],
    acceptance_criteria: [
      "1. `--help` lists every command and flag.",
      "2. Invalid arguments exit non-zero with a message on stderr and no stack trace.",
      "3. The core command produces the expected output for the documented example.",
    ],
    tests: [
      "- Unit tests for argument parsing and core transforms.",
      "- Snapshot tests of stdout, stderr and exit codes for the documented examples.",
    ],
  },
};
