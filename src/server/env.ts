import "server-only";
import { z } from "zod";

const serverEnvironmentSchema = z.object({
  GROQ_API_KEY: z.string().min(10),
  GROQ_MODEL: z.string().min(1).default("openai/gpt-oss-120b"),
  // The fallback is optional: without it a provider failure goes straight to the deterministic skeleton.
  GEMINI_API_KEY: z.preprocess((value) => (value === "" ? undefined : value), z.string().min(10).optional()),
  GEMINI_MODEL: z.string().min(1).default("gemini-3.5-flash"),
  CORS_ALLOWED_ORIGINS: z
    .string()
    .default("https://localhost")
    .transform((value) =>
      value
        .split(",")
        .map((origin) => origin.trim())
        .filter(Boolean),
    ),
  // Anyone with the link can generate, so these caps are what protect the free model quota.
  DAILY_TOKEN_CAP_PER_CLIENT: z.coerce.number().int().positive().default(60_000),
  MONTHLY_TOKEN_CAP_GLOBAL: z.coerce.number().int().positive().default(5_000_000),
  GENERATE_LIMIT_PER_MINUTE_IP: z.coerce.number().int().positive().default(6),
  LIGHT_LIMIT_PER_MINUTE_IP: z.coerce.number().int().positive().default(120),
});

export type ServerEnvironment = z.infer<typeof serverEnvironmentSchema>;

let cachedEnvironment: ServerEnvironment | undefined;

/** Parses once and throws on the first call if anything is missing, so a misconfigured deploy fails at boot. */
export function serverEnvironment(): ServerEnvironment {
  if (cachedEnvironment) return cachedEnvironment;
  const parsed = serverEnvironmentSchema.safeParse(process.env);
  if (!parsed.success) {
    // Only variable names are reported; values may be secrets.
    const missing = parsed.error.issues.map((issue) => issue.path.join(".")).join(", ");
    throw new Error(`Invalid server environment: ${missing}. See .env.example.`);
  }
  cachedEnvironment = parsed.data;
  return cachedEnvironment;
}

export function resetServerEnvironmentForTests(): void {
  cachedEnvironment = undefined;
}
