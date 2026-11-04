import "server-only";

// In-memory state for one server instance. On Vercel several instances may run and each restarts
// independently, so these limits are approximate. That is acceptable here: the model keys are
// free-tier, so the worst case of abuse is quota exhaustion (the app degrades to the skeleton), not a bill.

const MAX_KEYS = 10_000;

/** Drops the oldest entries once a map grows past the cap, so a flood of new IPs cannot exhaust memory. */
function enforceCap<Key, Value>(map: Map<Key, Value>, cap: number): void {
  while (map.size > cap) {
    const oldest = map.keys().next();
    if (oldest.done) return;
    map.delete(oldest.value);
  }
}

export class FixedWindowLimiter {
  private readonly windows = new Map<string, { windowStart: number; hits: number }>();

  hit(
    key: string,
    limit: number,
    windowMs: number,
    now: number,
  ): { allowed: boolean; retryAfterSeconds: number } {
    const windowStart = Math.floor(now / windowMs) * windowMs;
    const current = this.windows.get(key);
    const hits = current?.windowStart === windowStart ? current.hits + 1 : 1;
    this.windows.delete(key);
    this.windows.set(key, { windowStart, hits });
    enforceCap(this.windows, MAX_KEYS);
    const allowed = hits <= limit;
    return {
      allowed,
      retryAfterSeconds: allowed ? 0 : Math.max(1, Math.ceil((windowStart + windowMs - now) / 1000)),
    };
  }
}

function utcDay(now: number): string {
  return new Date(now).toISOString().slice(0, 10);
}

function utcMonth(now: number): string {
  return new Date(now).toISOString().slice(0, 7);
}

export type ReserveOutcome = "ok" | "daily_cap" | "monthly_cap";

export class TokenBudget {
  private readonly daily = new Map<string, number>();
  private readonly monthly = new Map<string, number>();

  reserve(key: string, tokens: number, dailyCap: number, monthlyCap: number, now: number): ReserveOutcome {
    const dayKey = `${utcDay(now)}:${key}`;
    const monthKey = utcMonth(now);
    const monthUsed = this.monthly.get(monthKey) ?? 0;
    if (monthUsed + tokens > monthlyCap) return "monthly_cap";
    const dayUsed = this.daily.get(dayKey) ?? 0;
    if (dayUsed + tokens > dailyCap) return "daily_cap";
    this.daily.delete(dayKey);
    this.daily.set(dayKey, dayUsed + tokens);
    this.monthly.set(monthKey, monthUsed + tokens);
    enforceCap(this.daily, MAX_KEYS);
    enforceCap(this.monthly, 24);
    return "ok";
  }

  /** Corrects a reservation once the real usage is known (usually a negative delta). */
  settle(key: string, delta: number, now: number): void {
    const dayKey = `${utcDay(now)}:${key}`;
    const monthKey = utcMonth(now);
    const dayUsed = this.daily.get(dayKey);
    if (dayUsed !== undefined) this.daily.set(dayKey, Math.max(0, dayUsed + delta));
    const monthUsed = this.monthly.get(monthKey);
    if (monthUsed !== undefined) this.monthly.set(monthKey, Math.max(0, monthUsed + delta));
  }
}

export class LruCache<Value> {
  private readonly entries = new Map<string, { value: Value; expiresAt: number }>();

  constructor(
    private readonly maxEntries: number,
    private readonly ttlMs: number,
  ) {}

  get(key: string, now: number): Value | undefined {
    const entry = this.entries.get(key);
    if (!entry) return undefined;
    this.entries.delete(key);
    if (entry.expiresAt <= now) return undefined;
    this.entries.set(key, entry);
    return entry.value;
  }

  set(key: string, value: Value, now: number): void {
    this.entries.delete(key);
    this.entries.set(key, { value, expiresAt: now + this.ttlMs });
    enforceCap(this.entries, this.maxEntries);
  }
}
