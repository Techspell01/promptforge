import "server-only";
import { createHash } from "node:crypto";
import type { ClarifyAnswers } from "@/features/clarify/taxonomy";
import type { Settings } from "@/features/settings/settings.schema";
import type { ModelContent } from "@/features/skeleton/build";
import { LruCache } from "@/server/memory-store";
import { TEMPLATE_VERSION } from "@/templates";

const CACHE_ENTRIES = 500;
const CACHE_TTL_MS = 24 * 60 * 60 * 1000;

let cache = new LruCache<{ content: ModelContent; model: string }>(CACHE_ENTRIES, CACHE_TTL_MS);

export function resetCacheForTests(): void {
  cache = new LruCache(CACHE_ENTRIES, CACHE_TTL_MS);
}

/** Same idea + settings + answers + template version always maps to the same key. */
export function cacheKey(idea: string, settings: Settings, answers: ClarifyAnswers): string {
  const normalisedIdea = idea.trim().replace(/\s+/g, " ").toLowerCase();
  const sortedAnswers = Object.fromEntries(
    Object.entries(answers).sort(([left], [right]) => left.localeCompare(right)),
  );
  const material = JSON.stringify([TEMPLATE_VERSION, normalisedIdea, settings, sortedAnswers]);
  return createHash("sha256").update(material).digest("hex");
}

export function readCache(key: string): { content: ModelContent; model: string } | undefined {
  return cache.get(key, Date.now());
}

export function writeCache(key: string, content: ModelContent, model: string): void {
  cache.set(key, { content, model }, Date.now());
}
