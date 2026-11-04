export type Result<Value, Failure = AppError> =
  { readonly ok: true; readonly value: Value } | { readonly ok: false; readonly error: Failure };

export function success<Value>(value: Value): Result<Value, never> {
  return { ok: true, value };
}

export function failure<Failure>(error: Failure): Result<never, Failure> {
  return { ok: false, error };
}

export type ErrorCode =
  | "invalid_input"
  | "unauthenticated"
  | "not_found"
  | "rate_limited"
  | "daily_cap"
  | "monthly_cap"
  | "provider_failed"
  | "timeout"
  | "cancelled"
  | "internal";

export interface AppError {
  readonly code: ErrorCode;
  /** Shown to the user. Never contains provider bodies, stack traces or key material. */
  readonly message: string;
  readonly retryAfterSeconds?: number;
  readonly fieldErrors?: Readonly<Record<string, string>>;
}

const STATUS_BY_CODE: Record<ErrorCode, number> = {
  invalid_input: 400,
  unauthenticated: 401,
  not_found: 404,
  rate_limited: 429,
  daily_cap: 429,
  monthly_cap: 503,
  provider_failed: 502,
  timeout: 504,
  cancelled: 499,
  internal: 500,
};

export function statusForError(error: AppError): number {
  return STATUS_BY_CODE[error.code];
}

export const userMessages = {
  invalid_input: "The request was not valid.",
  unauthenticated: "Sign in to continue.",
  not_found: "Not found.",
  rate_limited: "Too many requests. Try again shortly.",
  daily_cap: "Daily generation limit reached. It resets at 00:00 UTC.",
  monthly_cap: "PromptForge has reached its monthly generation limit. Try again next month.",
  provider_failed: "The model is unavailable right now.",
  timeout: "The model took too long to respond.",
  cancelled: "Generation was cancelled.",
  internal: "Something went wrong.",
} as const satisfies Record<ErrorCode, string>;

export function appError(code: ErrorCode, extra: Partial<Omit<AppError, "code">> = {}): AppError {
  return { code, message: userMessages[code], ...extra };
}
