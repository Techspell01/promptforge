// Threat: provider error bodies (which can echo prompts or keys) leaking to users or logs.
import { afterEach, describe, expect, it, vi } from "vitest";
import { openAiCompatibleProvider, ProviderError } from "./provider";

function sse(lines: readonly string[]): ReadableStream<Uint8Array> {
  const encoder = new TextEncoder();
  return new ReadableStream({
    start(controller) {
      for (const line of lines) controller.enqueue(encoder.encode(line));
      controller.close();
    },
  });
}

const provider = openAiCompatibleProvider({
  name: "test",
  baseUrl: "https://example.test/v1",
  apiKey: "test-key",
  model: "m",
});
const request = { messages: [{ role: "user" as const, content: "hi" }], maxOutputTokens: 100 };

async function collect(): Promise<string> {
  let text = "";
  for await (const delta of provider.streamChat(request, new AbortController().signal)) text += delta;
  return text;
}

afterEach(() => {
  vi.unstubAllGlobals();
});

describe("OpenAI-compatible provider", () => {
  it("streams content deltas and stops at [DONE]", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn(() =>
        Promise.resolve(
          new Response(
            sse([
              'data: {"choices":[{"delta":{"content":"@@go"}}]}\n\n',
              'data: {"choices":[{"delta":{"reasoning":"thinking..."}}]}\n\n',
              'data: {"choices":[{"delta":{"content":"al\\n- A."}}]}\n\ndata: [DONE]\n\n',
            ]),
          ),
        ),
      ),
    );
    expect(await collect()).toBe("@@goal\n- A.");
  });

  it("throws a ProviderError carrying only the status, never the body", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn(() =>
        Promise.resolve(new Response('{"error":"invalid key gsk_leakedkey123456"}', { status: 401 })),
      ),
    );
    const error = await collect().catch((caught: unknown) => caught);
    expect(error).toBeInstanceOf(ProviderError);
    expect((error as Error).message).not.toContain("gsk_");
    expect((error as ProviderError).status).toBe(401);
  });

  it("treats an empty stream as a failure", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn(() => Promise.resolve(new Response(sse(["data: [DONE]\n\n"])))),
    );
    await expect(collect()).rejects.toBeInstanceOf(ProviderError);
  });

  it("treats malformed chunks as a failure", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn(() => Promise.resolve(new Response(sse(["data: {not json\n\n"])))),
    );
    await expect(collect()).rejects.toBeInstanceOf(ProviderError);
  });
});
