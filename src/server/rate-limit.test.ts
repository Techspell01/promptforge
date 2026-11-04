// Threat: anyone with the link can call the API. Per-IP limits and token caps protect the free model quota.
import { describe, expect, it } from "vitest";
import { POST as analyzeRoute } from "@/app/api/analyze/route";
import { DEFAULT_SETTINGS } from "@/features/settings/settings.schema";
import { FixedWindowLimiter, LruCache, TokenBudget } from "./memory-store";
import { clientKey } from "./rate-limit";

const body = JSON.stringify({
  sections: [
    { id: "acceptance_criteria", content: "1. Works.", enabled: true },
    { id: "security", content: "- Secrets: server-only.", enabled: true },
  ],
  settings: DEFAULT_SETTINGS,
});

function analyze(ip: string): Promise<Response> {
  return analyzeRoute(
    new Request("http://localhost:3000/api/analyze", {
      method: "POST",
      headers: { "content-type": "application/json", "x-real-ip": ip },
      body,
    }),
  );
}

describe("rate limits through the API", () => {
  it("returns 429 with Retry-After once an IP exceeds its limit", async () => {
    process.env.LIGHT_LIMIT_PER_MINUTE_IP = "3";
    try {
      const statuses: number[] = [];
      let last: Response | undefined;
      for (let attempt = 0; attempt < 4; attempt += 1) {
        last = await analyze("198.51.100.1");
        statuses.push(last.status);
      }
      expect(statuses).toEqual([200, 200, 200, 429]);
      const retryAfter = Number(last?.headers.get("retry-after"));
      expect(retryAfter).toBeGreaterThanOrEqual(1);
      expect(retryAfter).toBeLessThanOrEqual(60);
    } finally {
      delete process.env.LIGHT_LIMIT_PER_MINUTE_IP;
    }
  });

  it("keeps separate buckets per IP", async () => {
    process.env.LIGHT_LIMIT_PER_MINUTE_IP = "1";
    try {
      expect((await analyze("198.51.100.2")).status).toBe(200);
      expect((await analyze("198.51.100.3")).status).toBe(200);
      expect((await analyze("198.51.100.2")).status).toBe(429);
    } finally {
      delete process.env.LIGHT_LIMIT_PER_MINUTE_IP;
    }
  });

  it("identifies clients by a hash, never the raw IP", () => {
    const key = clientKey(new Request("http://localhost", { headers: { "x-real-ip": "203.0.113.9" } }));
    expect(key).toMatch(/^[a-f0-9]{64}$/);
    expect(key).not.toContain("203.0.113.9");
  });
});

describe("memory store", () => {
  it("resets a fixed window when the next window starts", () => {
    const limiter = new FixedWindowLimiter();
    expect(limiter.hit("k", 1, 60_000, 0).allowed).toBe(true);
    expect(limiter.hit("k", 1, 60_000, 30_000)).toEqual({ allowed: false, retryAfterSeconds: 30 });
    expect(limiter.hit("k", 1, 60_000, 60_000).allowed).toBe(true);
  });

  it("enforces daily per-client and monthly global token caps, and settles reservations", () => {
    const budget = new TokenBudget();
    const day = Date.UTC(2026, 10, 4, 12);
    expect(budget.reserve("a", 900, 1000, 5000, day)).toBe("ok");
    expect(budget.reserve("a", 200, 1000, 5000, day)).toBe("daily_cap");
    budget.settle("a", -500, day);
    expect(budget.reserve("a", 200, 1000, 5000, day)).toBe("ok");
    expect(budget.reserve("a", 200, 1000, 5000, day + 86_400_000)).toBe("ok");
    expect(budget.reserve("b", 5000, 10_000, 5000, day)).toBe("monthly_cap");
  });

  it("expires cache entries and evicts the least recently used", () => {
    const cache = new LruCache<number>(2, 1000);
    cache.set("a", 1, 0);
    cache.set("b", 2, 0);
    cache.get("a", 10);
    cache.set("c", 3, 10);
    expect(cache.get("b", 10)).toBeUndefined();
    expect(cache.get("a", 10)).toBe(1);
    expect(cache.get("a", 2000)).toBeUndefined();
  });
});
