"use client";

import { useRef, useState } from "react";
import { streamGeneration } from "@/client/api";
import { localLibrary } from "@/client/local-library";
import type { PromptRecord } from "@/features/library/library.schema";
import { SECTION_TITLES, type SectionId } from "@/features/skeleton/sections";
import type { GenerateEvent, GenerateRequest, GenerateResult } from "./generate.schema";

export type GenerationState =
  | { readonly phase: "idle" }
  | { readonly phase: "streaming"; readonly stage: string; readonly preview: string }
  | {
      readonly phase: "done";
      readonly result: GenerateResult;
      readonly request: GenerateRequest;
      readonly localId: string;
    }
  | { readonly phase: "failed"; readonly message: string };

const STAGE_LABELS = {
  generating: "Generating",
  fallback: "Primary model unavailable, trying the fallback",
  skeleton: "Models unavailable, building the deterministic skeleton",
} as const;

function toRecord(id: string, request: GenerateRequest, result: GenerateResult): PromptRecord {
  const now = new Date().toISOString();
  return {
    id,
    title: result.title,
    rawIdea: request.idea,
    settings: request.settings,
    sections: result.sections,
    generatedText: result.text,
    tokenCount: result.tokenCount,
    qualityScore: result.score.score,
    archetype: request.settings.archetype,
    saved: false,
    tags: [],
    createdAt: now,
    updatedAt: now,
  };
}

function appendDelta(
  preview: string,
  lastSection: SectionId | null,
  section: SectionId,
  text: string,
): string {
  const header = section === lastSection ? "" : `${preview ? "\n" : ""}## ${SECTION_TITLES[section]}\n`;
  return `${preview}${header}${text}`;
}

export function useGeneration() {
  const [state, setState] = useState<GenerationState>({ phase: "idle" });
  const controller = useRef<AbortController | null>(null);

  async function start(request: GenerateRequest) {
    controller.current?.abort();
    const abort = new AbortController();
    controller.current = abort;
    let preview = "";
    let lastSection: SectionId | null = null;
    let stage: string = STAGE_LABELS.generating;
    // An object, not a let: the closure below mutates it and the check after the await must see that.
    const progress = { finished: false };
    setState({ phase: "streaming", stage, preview });

    const onEvent = (event: GenerateEvent) => {
      switch (event.type) {
        case "status":
          stage = STAGE_LABELS[event.stage];
          break;
        case "reset":
          preview = "";
          lastSection = null;
          break;
        case "delta":
          preview = appendDelta(preview, lastSection, event.section, event.text);
          lastSection = event.section;
          break;
        case "done":
          {
            progress.finished = true;
            const localId = crypto.randomUUID();
            // History lives on this device only; the server keeps no copy.
            void localLibrary.add(toRecord(localId, request, event.result));
            setState({ phase: "done", result: event.result, request, localId });
          }
          return;
        case "error":
          progress.finished = true;
          setState({ phase: "failed", message: event.error.message });
          return;
      }
      setState({ phase: "streaming", stage, preview });
    };

    const outcome = await streamGeneration(request, onEvent, abort.signal);
    if (progress.finished) return;
    if (!outcome.ok) {
      setState(
        outcome.code === "cancelled" ? { phase: "idle" } : { phase: "failed", message: outcome.message },
      );
    } else {
      setState({ phase: "failed", message: "Generation ended unexpectedly." });
    }
  }

  function cancel() {
    controller.current?.abort();
    setState({ phase: "idle" });
  }

  function reset() {
    setState({ phase: "idle" });
  }

  return { state, start, cancel, reset };
}
