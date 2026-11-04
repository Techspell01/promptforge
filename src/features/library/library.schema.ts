import { z } from "zod";
import { ARCHETYPES, settingsSchema } from "@/features/settings/settings.schema";
import { sectionSchema } from "@/features/skeleton/section.schema";

export const HISTORY_LIMIT = 50;
export const LIBRARY_LIMIT = 500;
export const MAX_TAGS = 10;

export const tagNameSchema = z
  .string()
  .trim()
  .toLowerCase()
  .min(1)
  .max(32)
  .regex(/^[a-z0-9][a-z0-9 _-]*$/, "Tags use letters, numbers, spaces, - and _.");

/** On-device storage is a boundary too: anything read back is validated before use. */
export const promptRecordSchema = z.object({
  id: z.uuid(),
  title: z.string().min(1).max(120),
  rawIdea: z.string().max(2000),
  settings: settingsSchema,
  sections: z.array(sectionSchema),
  generatedText: z.string().max(40_000),
  tokenCount: z.number().int().nonnegative(),
  qualityScore: z.number().int().min(0).max(100),
  archetype: z.enum(ARCHETYPES),
  saved: z.boolean(),
  tags: z.array(tagNameSchema).max(MAX_TAGS),
  createdAt: z.iso.datetime(),
  updatedAt: z.iso.datetime(),
});

export type PromptRecord = z.infer<typeof promptRecordSchema>;

export interface LibraryQuery {
  readonly view: "library" | "history";
  readonly q?: string;
  readonly tag?: string | null;
}
