import { z } from "zod";
import { SECTION_IDS, PROTECTED_SECTIONS } from "./sections";

export const sectionSchema = z.strictObject({
  id: z.enum(SECTION_IDS),
  content: z.string().max(6000),
  enabled: z.boolean(),
});

export const sectionListSchema = z
  .array(sectionSchema)
  .min(1)
  .max(SECTION_IDS.length)
  .refine(
    (sections) => new Set(sections.map((section) => section.id)).size === sections.length,
    "Duplicate section.",
  )
  .refine(
    (sections) =>
      [...PROTECTED_SECTIONS].every((id) => sections.some((section) => section.id === id && section.enabled)),
    "SECURITY and ACCEPTANCE CRITERIA cannot be removed.",
  );
