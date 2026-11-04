import { z } from "zod";
import { containsControlCharacters } from "@/features/skeleton/sanitize";

export const IDEA_MAX_CHARACTERS = 2000;

export const ideaSchema = z
  .string()
  .trim()
  .min(1, "Describe the idea.")
  .max(IDEA_MAX_CHARACTERS, `Keep the idea under ${IDEA_MAX_CHARACTERS} characters.`)
  .refine((value) => !containsControlCharacters(value), "The idea contains control characters.");
