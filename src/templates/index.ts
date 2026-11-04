import type { Archetype } from "@/features/settings/settings.schema";
import { apiRecipe } from "./api";
import { cliRecipe } from "./cli";
import { extensionRecipe } from "./extension";
import { mobileRecipe } from "./mobile";
import { pipelineRecipe } from "./pipeline";
import type { ArchetypeRecipe } from "./types";
import { webRecipe } from "./web";

/** Bump when any recipe, checklist or model brief changes: it is part of the generation cache key. */
export const TEMPLATE_VERSION = "2026-11-04.2";

export const RECIPES: Readonly<Record<Archetype, ArchetypeRecipe>> = {
  web: webRecipe,
  api: apiRecipe,
  cli: cliRecipe,
  mobile: mobileRecipe,
  pipeline: pipelineRecipe,
  extension: extensionRecipe,
};

export function recipeFor(archetype: Archetype): ArchetypeRecipe {
  return RECIPES[archetype];
}

export type { ArchetypeRecipe } from "./types";
