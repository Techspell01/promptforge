import "server-only";
import { unresolvedTopics } from "@/features/clarify/clarify";
import { scorePrompt } from "@/features/score/scorer";
import { BUDGET_RANGES } from "@/features/settings/settings.schema";
import { assembleSections, type ModelContent, type SkeletonInput } from "@/features/skeleton/build";
import { deriveTitle, renderPrompt } from "@/features/skeleton/render";
import { pruneToBudget } from "@/features/tokens/pruner";
import { countTokens } from "@/features/tokens/tokenizer";
import { logger } from "@/server/logger";
import { ProviderError, type ModelProvider } from "@/server/models/provider";
import { reserveTokens, settleTokens } from "@/server/rate-limit";
import { cacheKey, readCache, writeCache } from "./cache";
import type { GenerateEvent, GenerateRequest, GenerateResult, GenerationSource } from "./generate.schema";
import { buildModelMessages, maxOutputTokens, modelSectionIds } from "./model-prompt";
import { SectionStreamParser } from "./section-stream";

export interface GenerateDependencies {
  readonly providers: readonly ModelProvider[];
  /** Per provider attempt. Two attempts must fit inside the route's maxDuration. */
  readonly attemptTimeoutMs: number;
}

type Emit = (event: GenerateEvent) => void;

/** A model answer is only usable if it filled a meaningful share of the requested sections. */
const MINIMUM_SECTIONS_FROM_MODEL = 3;

interface Attempt {
  readonly content: ModelContent | null;
  readonly model: string | null;
  readonly source: GenerationSource;
  readonly outputTokens: number;
  readonly attempts: number;
  readonly errorCode: string | null;
}

class CancelledByClient extends Error {}

async function streamFromProvider(
  provider: ModelProvider,
  messages: ReturnType<typeof buildModelMessages>,
  input: GenerateRequest,
  emit: Emit,
  clientSignal: AbortSignal,
  timeoutMs: number,
): Promise<{ content: ModelContent; outputText: string }> {
  const parser = new SectionStreamParser(new Set(modelSectionIds(input.settings)));
  const signal = AbortSignal.any([clientSignal, AbortSignal.timeout(timeoutMs)]);
  let outputText = "";
  try {
    for await (const delta of provider.streamChat(
      { messages, maxOutputTokens: maxOutputTokens(input.settings) },
      signal,
    )) {
      outputText += delta;
      for (const sectionDelta of parser.push(delta)) emit({ type: "delta", ...sectionDelta });
    }
  } catch (error) {
    if (clientSignal.aborted) throw new CancelledByClient();
    throw error;
  }
  const { deltas, sections } = parser.finish();
  for (const sectionDelta of deltas) emit({ type: "delta", ...sectionDelta });
  if (Object.keys(sections).length < MINIMUM_SECTIONS_FROM_MODEL)
    throw new ProviderError(provider.name, "empty_output");
  return { content: sections, outputText };
}

async function generateContent(
  input: GenerateRequest,
  skeletonInput: SkeletonInput,
  emit: Emit,
  signal: AbortSignal,
  dependencies: GenerateDependencies,
): Promise<Attempt> {
  const messages = buildModelMessages(skeletonInput);
  let outputTokens = 0;
  let attempts = 0;
  let lastErrorCode: string | null = null;

  for (const [index, provider] of dependencies.providers.entries()) {
    attempts += 1;
    if (index > 0) emit({ type: "reset" });
    emit({ type: "status", stage: index === 0 ? "generating" : "fallback", model: provider.model });
    try {
      const { content, outputText } = await streamFromProvider(
        provider,
        messages,
        input,
        emit,
        signal,
        dependencies.attemptTimeoutMs,
      );
      outputTokens += countTokens(outputText);
      return {
        content,
        model: provider.model,
        source: index === 0 ? "model" : "fallback_model",
        outputTokens,
        attempts,
        errorCode: lastErrorCode,
      };
    } catch (error) {
      if (error instanceof CancelledByClient) throw error;
      lastErrorCode =
        error instanceof ProviderError
          ? `${error.provider}_${error.reason}${error.status ? `_${error.status}` : ""}`
          : "timeout";
      logger.warn("generate.provider_failed", { provider: provider.name, code: lastErrorCode });
    }
  }
  emit({ type: "reset" });
  emit({ type: "status", stage: "skeleton" });
  return { content: null, model: null, source: "skeleton", outputTokens, attempts, errorCode: lastErrorCode };
}

/** Metrics only: never the idea, the prompt text or the client key. */
function recordGeneration(row: {
  archetype: string;
  model: string;
  inputTokens: number;
  outputTokens: number;
  latencyMs: number;
  status: "succeeded" | "fallback" | "failed" | "cancelled" | "cached";
  errorCode: string | null;
}): void {
  logger.info("generate.recorded", row);
}

/** Streams events to the caller and always ends with exactly one `done` or `error` event. */
export async function runGeneration(
  client: { readonly key: string },
  input: GenerateRequest,
  emit: Emit,
  signal: AbortSignal,
  dependencies: GenerateDependencies,
): Promise<void> {
  const startedAt = Date.now();
  const skeletonInput: SkeletonInput = {
    idea: input.idea,
    settings: input.settings,
    answers: input.answers,
    unresolved: unresolvedTopics(input.idea, input.settings, input.answers),
  };
  const key = cacheKey(input.idea, input.settings, input.answers);
  const cached = readCache(key);

  let attempt: Attempt;
  let inputTokens = 0;
  if (cached) {
    attempt = {
      content: cached.content,
      model: cached.model,
      source: "cache",
      outputTokens: 0,
      attempts: 0,
      errorCode: null,
    };
  } else {
    inputTokens = buildModelMessages(skeletonInput).reduce(
      (sum, message) => sum + countTokens(message.content),
      0,
    );
    const reserved = inputTokens + maxOutputTokens(input.settings);
    const reservation = reserveTokens(client.key, reserved);
    if (!reservation.ok) {
      emit({ type: "error", error: { code: reservation.error.code, message: reservation.error.message } });
      return;
    }
    try {
      attempt = await generateContent(input, skeletonInput, emit, signal, dependencies);
    } catch (error) {
      if (!(error instanceof CancelledByClient)) throw error;
      settleTokens(client.key, inputTokens - reserved);
      recordGeneration({
        archetype: input.settings.archetype,
        model: dependencies.providers[0]?.model ?? "none",
        inputTokens,
        outputTokens: 0,
        latencyMs: Date.now() - startedAt,
        status: "cancelled",
        errorCode: "cancelled",
      });
      return;
    }
    settleTokens(client.key, inputTokens * attempt.attempts + attempt.outputTokens - reserved);
    if (attempt.content && attempt.model) writeCache(key, attempt.content, attempt.model);
  }

  const budget = BUDGET_RANGES[input.settings.budget];
  const pruned = pruneToBudget(
    assembleSections(skeletonInput, attempt.content ?? {}),
    budget.max,
    countTokens,
  );
  const text = renderPrompt(pruned.sections);
  const score = scorePrompt({ sections: pruned.sections, tokenCount: pruned.tokenCount, budget });
  const title = deriveTitle(input.idea);

  const statusBySource = {
    model: "succeeded",
    fallback_model: "fallback",
    skeleton: "failed",
    cache: "cached",
  } as const;
  recordGeneration({
    archetype: input.settings.archetype,
    model: attempt.model ?? "skeleton",
    inputTokens: inputTokens * attempt.attempts,
    outputTokens: attempt.outputTokens,
    latencyMs: Date.now() - startedAt,
    status: statusBySource[attempt.source],
    errorCode: attempt.errorCode,
  });
  logger.info("generate.completed", {
    source: attempt.source,
    tokens: pruned.tokenCount,
    latencyMs: Date.now() - startedAt,
  });

  // Nothing is stored server-side: the client keeps the result in its on-device history.
  const result: GenerateResult = {
    title,
    sections: pruned.sections,
    text,
    tokenCount: pruned.tokenCount,
    budget,
    withinBudget: pruned.withinBudget,
    removed: pruned.removed,
    score,
    source: attempt.source,
    model: attempt.model,
  };
  emit({ type: "done", result });
}
