"use client";

import type { GenerateEvent, GenerateRequest } from "@/features/generate/generate.schema";

/** Empty on the web (same origin). The Android build points this at the deployed site. */
const API_BASE_URL = process.env.NEXT_PUBLIC_API_BASE_URL ?? "";

export type ApiResult<Value> =
  | { readonly ok: true; readonly value: Value }
  | { readonly ok: false; readonly code: string; readonly message: string; readonly offline: boolean };

function offlineFailure<Value>(): ApiResult<Value> {
  return { ok: false, code: "offline", message: "You are offline.", offline: true };
}

async function failureFrom<Value>(response: Response): Promise<ApiResult<Value>> {
  const fallbackMessage =
    response.status === 429 ? "Too many requests. Try again shortly." : "Something went wrong.";
  try {
    const body = (await response.json()) as { error?: { code?: string; message?: string } };
    return {
      ok: false,
      code: body.error?.code ?? "internal",
      message: body.error?.message ?? fallbackMessage,
      offline: false,
    };
  } catch {
    return { ok: false, code: "internal", message: fallbackMessage, offline: false };
  }
}

export async function apiRequest<Value>(
  path: string,
  init: { method?: string; body?: unknown } = {},
): Promise<ApiResult<Value>> {
  const headers: Record<string, string> = {};
  if (init.body !== undefined) headers["Content-Type"] = "application/json";
  let response: Response;
  try {
    response = await fetch(`${API_BASE_URL}${path}`, {
      method: init.method ?? "GET",
      headers,
      body: init.body === undefined ? undefined : JSON.stringify(init.body),
    });
  } catch {
    return offlineFailure();
  }
  if (!response.ok) return failureFrom(response);
  return { ok: true, value: (await response.json()) as Value };
}

/** Reads the NDJSON event stream from /api/generate. Resolves when the stream ends or is aborted. */
export async function streamGeneration(
  request: GenerateRequest,
  onEvent: (event: GenerateEvent) => void,
  signal: AbortSignal,
): Promise<ApiResult<void>> {
  let response: Response;
  try {
    response = await fetch(`${API_BASE_URL}/api/generate`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(request),
      signal,
    });
  } catch {
    if (signal.aborted) return { ok: false, code: "cancelled", message: "Cancelled.", offline: false };
    return offlineFailure();
  }
  if (!response.ok || !response.body) return failureFrom(response);

  const reader = response.body.getReader();
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
        if (line) onEvent(JSON.parse(line) as GenerateEvent);
      }
    }
  } catch {
    if (signal.aborted) return { ok: false, code: "cancelled", message: "Cancelled.", offline: false };
    return {
      ok: false,
      code: "stream_failed",
      message: "The connection dropped during generation.",
      offline: false,
    };
  }
  return { ok: true, value: undefined };
}
