import { beforeEach } from "vitest";
import { resetCacheForTests } from "@/features/generate/cache";
import { resetServerEnvironmentForTests } from "@/server/env";
import { resetLimitsForTests } from "@/server/rate-limit";

// Tests never call a real model: provider tests stub fetch and generation tests inject fake providers.
process.env.GROQ_API_KEY = "test-groq-key-not-used";
delete process.env.GEMINI_API_KEY;
process.env.CORS_ALLOWED_ORIGINS = "https://localhost";

beforeEach(() => {
  resetServerEnvironmentForTests();
  resetLimitsForTests();
  resetCacheForTests();
});
