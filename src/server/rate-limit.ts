import "server-only";
import { createHash } from "node:crypto";
import { serverEnvironment } from "./env";
import { FixedWindowLimiter, TokenBudget } from "./memory-store";
import { appError, failure, success, type Result } from "./result";

export type LimitKind = "generate" | "light";

const WINDOW_MS = 60_000;

let limiter = new FixedWindowLimiter();
let budget = new TokenBudget();

export function resetLimitsForTests(): void {
  limiter = new FixedWindowLimiter();
  budget = new TokenBudget();
}

/** Vercel sets x-real-ip; elsewhere the first x-forwarded-for hop is used. Off-platform these headers are spoofable. */
export function clientIp(request: Request): string {
  const realIp = request.headers.get("x-real-ip")?.trim();
  if (realIp) return realIp.slice(0, 64);
  const forwarded = request.headers.get("x-forwarded-for")?.split(",")[0]?.trim();
  return (forwarded ?? "unknown").slice(0, 64);
}

/** There are no accounts, so the client is identified by a hash of its IP. The raw IP is never kept. */
export function clientKey(request: Request): string {
  return createHash("sha256")
    .update(`promptforge:${clientIp(request)}`)
    .digest("hex");
}

export function enforceRateLimit(kind: LimitKind, key: string, now = Date.now()): Result<void> {
  const environment = serverEnvironment();
  const limit =
    kind === "generate" ? environment.GENERATE_LIMIT_PER_MINUTE_IP : environment.LIGHT_LIMIT_PER_MINUTE_IP;
  const outcome = limiter.hit(`${kind}:${key}`, limit, WINDOW_MS, now);
  return outcome.allowed
    ? success(undefined)
    : failure(appError("rate_limited", { retryAfterSeconds: outcome.retryAfterSeconds }));
}

export function reserveTokens(key: string, tokens: number, now = Date.now()): Result<void> {
  const environment = serverEnvironment();
  const outcome = budget.reserve(
    key,
    tokens,
    environment.DAILY_TOKEN_CAP_PER_CLIENT,
    environment.MONTHLY_TOKEN_CAP_GLOBAL,
    now,
  );
  if (outcome === "daily_cap") {
    return failure(appError("daily_cap", { retryAfterSeconds: secondsUntilUtcMidnight(now) }));
  }
  if (outcome === "monthly_cap") return failure(appError("monthly_cap"));
  return success(undefined);
}

export function settleTokens(key: string, delta: number, now = Date.now()): void {
  if (delta !== 0) budget.settle(key, delta, now);
}

function secondsUntilUtcMidnight(now: number): number {
  const date = new Date(now);
  const midnight = Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), date.getUTCDate() + 1);
  return Math.ceil((midnight - now) / 1000);
}
