import "server-only";
import { serverEnvironment } from "@/server/env";
import { openAiCompatibleProvider, type ModelProvider } from "./provider";

/** Primary first, then the optional fallback. Clarify and score are deterministic, so only the final prompt uses a model. */
export function configuredProviders(): ModelProvider[] {
  const environment = serverEnvironment();
  const providers: ModelProvider[] = [
    openAiCompatibleProvider({
      name: "groq",
      baseUrl: "https://api.groq.com/openai/v1",
      apiKey: environment.GROQ_API_KEY,
      model: environment.GROQ_MODEL,
      extraBody: environment.GROQ_MODEL.startsWith("openai/gpt-oss") ? { reasoning_effort: "low" } : {},
    }),
  ];
  if (environment.GEMINI_API_KEY) {
    providers.push(
      openAiCompatibleProvider({
        name: "gemini",
        baseUrl: "https://generativelanguage.googleapis.com/v1beta/openai",
        apiKey: environment.GEMINI_API_KEY,
        model: environment.GEMINI_MODEL,
      }),
    );
  }
  return providers;
}
