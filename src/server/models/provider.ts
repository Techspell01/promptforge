import "server-only";
import { z } from "zod";

export interface ChatMessage {
  readonly role: "system" | "user";
  readonly content: string;
}

export interface ChatRequest {
  readonly messages: readonly ChatMessage[];
  readonly maxOutputTokens: number;
}

export interface ModelProvider {
  readonly name: string;
  readonly model: string;
  /** Yields content deltas. Throws ProviderError on any failure; never yields provider error bodies. */
  streamChat(request: ChatRequest, signal: AbortSignal): AsyncIterable<string>;
}

export class ProviderError extends Error {
  constructor(
    readonly provider: string,
    readonly reason: "http_status" | "network" | "malformed_stream" | "empty_output",
    readonly status?: number,
  ) {
    super(`${provider} failed: ${reason}${status ? ` (${status})` : ""}`);
    this.name = "ProviderError";
  }
}

const chunkSchema = z.object({
  choices: z
    .array(z.object({ delta: z.object({ content: z.string().nullish() }).partial().nullish() }))
    .default([]),
});

interface OpenAiCompatibleConfig {
  readonly name: string;
  readonly baseUrl: string;
  readonly apiKey: string;
  readonly model: string;
  /** Provider-specific request fields, e.g. reasoning effort. */
  readonly extraBody?: Readonly<Record<string, unknown>>;
}

async function* readServerSentEvents(
  body: ReadableStream<Uint8Array>,
  provider: string,
): AsyncIterable<string> {
  const reader = body.getReader();
  const decoder = new TextDecoder();
  let buffer = "";
  try {
    for (;;) {
      const { value, done } = await reader.read();
      if (done) break;
      buffer += decoder.decode(value, { stream: true });
      let newline = buffer.indexOf("\n");
      while (newline !== -1) {
        const line = buffer.slice(0, newline).trim();
        buffer = buffer.slice(newline + 1);
        newline = buffer.indexOf("\n");
        if (!line.startsWith("data:")) continue;
        const payload = line.slice(5).trim();
        if (payload === "[DONE]") return;
        let json: unknown;
        try {
          json = JSON.parse(payload);
        } catch {
          throw new ProviderError(provider, "malformed_stream");
        }
        const parsed = chunkSchema.safeParse(json);
        if (!parsed.success) throw new ProviderError(provider, "malformed_stream");
        const content = parsed.data.choices[0]?.delta?.content;
        if (content) yield content;
      }
    }
  } finally {
    reader.releaseLock();
  }
}

/** Groq and Gemini both expose OpenAI-compatible chat completions, so one small client covers both. */
export function openAiCompatibleProvider(config: OpenAiCompatibleConfig): ModelProvider {
  return {
    name: config.name,
    model: config.model,
    async *streamChat(request, signal) {
      let response: Response;
      try {
        response = await fetch(`${config.baseUrl}/chat/completions`, {
          method: "POST",
          signal,
          headers: { Authorization: `Bearer ${config.apiKey}`, "Content-Type": "application/json" },
          body: JSON.stringify({
            model: config.model,
            messages: request.messages,
            max_tokens: request.maxOutputTokens,
            temperature: 0.2,
            stream: true,
            ...config.extraBody,
          }),
        });
      } catch (error) {
        if (signal.aborted) throw error;
        throw new ProviderError(config.name, "network");
      }
      if (!response.ok || !response.body) {
        // The body is discarded on purpose: provider error bodies can echo prompts or key fragments.
        await response.body?.cancel();
        throw new ProviderError(config.name, "http_status", response.status);
      }
      let produced = false;
      for await (const delta of readServerSentEvents(response.body, config.name)) {
        produced = true;
        yield delta;
      }
      if (!produced) throw new ProviderError(config.name, "empty_output");
    },
  };
}
