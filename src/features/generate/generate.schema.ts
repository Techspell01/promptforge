import { z } from "zod";
import { clarifyAnswersSchema } from "@/features/clarify/taxonomy";
import { ideaSchema } from "@/features/idea-input/idea.schema";
import type { Removal } from "@/features/tokens/pruner";
import type { ScoreResult } from "@/features/score/scorer";
import { settingsSchema } from "@/features/settings/settings.schema";
import type { Section, SectionId } from "@/features/skeleton/sections";

export const generateRequestSchema = z.strictObject({
  idea: ideaSchema,
  settings: settingsSchema,
  answers: clarifyAnswersSchema.default({}),
});

export type GenerateRequest = z.infer<typeof generateRequestSchema>;

export type GenerationSource = "model" | "fallback_model" | "skeleton" | "cache";

export interface GenerateResult {
  readonly title: string;
  readonly sections: Section[];
  readonly text: string;
  readonly tokenCount: number;
  readonly budget: { readonly min: number; readonly max: number };
  readonly withinBudget: boolean;
  readonly removed: Removal[];
  readonly score: ScoreResult;
  readonly source: GenerationSource;
  readonly model: string | null;
}

export type GenerateEvent =
  | {
      readonly type: "status";
      readonly stage: "generating" | "fallback" | "skeleton";
      readonly model?: string;
    }
  | { readonly type: "delta"; readonly section: SectionId; readonly text: string }
  | { readonly type: "reset" }
  | { readonly type: "done"; readonly result: GenerateResult }
  | { readonly type: "error"; readonly error: { readonly code: string; readonly message: string } };
