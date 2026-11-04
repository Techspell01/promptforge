import { z } from "zod";
import { clarifyingQuestions } from "@/features/clarify/clarify";
import { clarifyAnswersSchema } from "@/features/clarify/taxonomy";
import { ideaSchema } from "@/features/idea-input/idea.schema";
import { settingsSchema } from "@/features/settings/settings.schema";
import { errorResponse, jsonResponse, preflight, readJson } from "@/server/http";
import { limitedRoute } from "@/server/route";

const clarifyRequestSchema = z.strictObject({
  idea: ideaSchema,
  settings: settingsSchema,
  answers: clarifyAnswersSchema.default({}),
});

export function OPTIONS(request: Request): Response {
  return preflight(request);
}

export function POST(request: Request): Promise<Response> {
  return limitedRoute(request, "clarify", "light", async () => {
    const body = await readJson(request, clarifyRequestSchema);
    if (!body.ok) return errorResponse(request, body.error);
    const { idea, settings, answers } = body.value;
    return jsonResponse(request, { questions: clarifyingQuestions(idea, settings, answers) });
  });
}
