import { z } from "zod";
import { settingsSchema } from "@/features/settings/settings.schema";
import { sectionListSchema } from "@/features/skeleton/section.schema";
import { analyzeSections } from "@/features/tokens/analyze";
import { errorResponse, jsonResponse, preflight, readJson } from "@/server/http";
import { limitedRoute } from "@/server/route";

const analyzeRequestSchema = z.strictObject({
  sections: sectionListSchema,
  settings: settingsSchema,
});

export function OPTIONS(request: Request): Response {
  return preflight(request);
}

/** Live recount and rescore for the editor. Deterministic and cheap, but still rate-limited. */
export function POST(request: Request): Promise<Response> {
  return limitedRoute(request, "analyze", "light", async () => {
    const body = await readJson(request, analyzeRequestSchema);
    if (!body.ok) return errorResponse(request, body.error);
    const analysis = analyzeSections(body.value.sections, body.value.settings);
    return jsonResponse(request, {
      text: analysis.text,
      tokenCount: analysis.tokenCount,
      budget: analysis.budget,
      score: analysis.score,
    });
  });
}
