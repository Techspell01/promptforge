import { generateRequestSchema, type GenerateEvent } from "@/features/generate/generate.schema";
import { runGeneration } from "@/features/generate/generate.service";
import { errorResponse, preflight, readJson, streamResponse } from "@/server/http";
import { logger } from "@/server/logger";
import { configuredProviders } from "@/server/models/providers";
import { appError } from "@/server/result";
import { limitedRoute } from "@/server/route";

// Two provider attempts of 25s each plus persistence must fit in this.
export const maxDuration = 60;
const ATTEMPT_TIMEOUT_MS = 25_000;

export function OPTIONS(request: Request): Response {
  return preflight(request);
}

export function POST(request: Request): Promise<Response> {
  return limitedRoute(request, "generate", "generate", async (client) => {
    const body = await readJson(request, generateRequestSchema);
    if (!body.ok) return errorResponse(request, body.error);

    const abort = new AbortController();
    request.signal.addEventListener("abort", () => {
      abort.abort();
    });
    const encoder = new TextEncoder();
    let closed = false;

    const stream = new ReadableStream<Uint8Array>({
      async start(controller) {
        const emit = (event: GenerateEvent) => {
          if (!closed) controller.enqueue(encoder.encode(`${JSON.stringify(event)}\n`));
        };
        try {
          await runGeneration(client, body.value, emit, abort.signal, {
            providers: configuredProviders(),
            attemptTimeoutMs: ATTEMPT_TIMEOUT_MS,
          });
        } catch (error) {
          logger.error("generate.unhandled", { error });
          const failure = appError("internal");
          emit({ type: "error", error: { code: failure.code, message: failure.message } });
        } finally {
          if (!closed) {
            closed = true;
            controller.close();
          }
        }
      },
      cancel() {
        closed = true;
        abort.abort();
      },
    });
    return streamResponse(request, stream);
  });
}
