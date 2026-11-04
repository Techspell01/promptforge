import { z } from "zod";

export const ARCHETYPES = ["web", "api", "cli", "mobile", "pipeline", "extension"] as const;
export type Archetype = (typeof ARCHETYPES)[number];

export const PLATFORMS = ["web", "android", "ios", "cross_platform", "desktop", "server", "browser"] as const;
export type Platform = (typeof PLATFORMS)[number];

export const BUDGET_TIERS = ["lean", "standard", "deep"] as const;
export type BudgetTier = (typeof BUDGET_TIERS)[number];

export const SECURITY_LEVELS = ["standard", "paranoid"] as const;
export type SecurityLevel = (typeof SECURITY_LEVELS)[number];

export const BUDGET_RANGES: Readonly<Record<BudgetTier, { readonly min: number; readonly max: number }>> = {
  lean: { min: 600, max: 900 },
  standard: { min: 1200, max: 1800 },
  deep: { min: 2500, max: 3500 },
};

export const settingsSchema = z.strictObject({
  archetype: z.enum(ARCHETYPES),
  platform: z.enum(PLATFORMS),
  stack: z
    .string()
    .trim()
    .max(160)
    // eslint-disable-next-line no-control-regex -- rejecting control characters is the point of this check
    .refine((value) => !/[\u0000-\u001F\u007F]/.test(value), "Stack contains control characters."),
  budget: z.enum(BUDGET_TIERS),
  securityLevel: z.enum(SECURITY_LEVELS),
});

export type Settings = z.infer<typeof settingsSchema>;

export const DEFAULT_SETTINGS: Settings = {
  archetype: "web",
  platform: "web",
  stack: "",
  budget: "standard",
  securityLevel: "standard",
};

export const ARCHETYPE_LABELS: Readonly<Record<Archetype, string>> = {
  web: "Web app",
  api: "API / backend",
  cli: "CLI tool",
  mobile: "Mobile app",
  pipeline: "Data pipeline",
  extension: "Browser extension",
};

export const PLATFORM_LABELS: Readonly<Record<Platform, string>> = {
  web: "Web",
  android: "Android",
  ios: "iOS",
  cross_platform: "Cross-platform",
  desktop: "Desktop",
  server: "Server",
  browser: "Browser",
};
