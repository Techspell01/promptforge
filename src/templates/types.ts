import type { Archetype } from "@/features/settings/settings.schema";
import type { SectionId } from "@/features/skeleton/sections";
import type { SecurityItem } from "./security-checklist";

export interface ArchetypeRecipe {
  readonly archetype: Archetype;
  /** Used in ROLE and in the model brief. */
  readonly engineerTitle: string;
  /** One sentence the model sees: what prompts for this archetype must and must not talk about. */
  readonly brief: string;
  /** Sections this archetype emits. Anything else from the model is discarded. */
  readonly sections: readonly SectionId[];
  readonly security: readonly SecurityItem[];
  readonly paranoidSecurity: readonly SecurityItem[];
  /** Deterministic content used for the skeleton fallback and to fill sections the model skipped. */
  readonly defaults: Readonly<Partial<Record<SectionId, readonly string[]>>>;
}
