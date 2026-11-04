import "server-only";

type LogLevel = "debug" | "info" | "warn" | "error";
type LogFields = Record<string, unknown>;

const SENSITIVE_FIELD = /key|token|secret|password|authorization|cookie|email|idea|prompt_text|content/i;
const SENSITIVE_VALUE_PATTERNS: readonly RegExp[] = [
  /eyJ[A-Za-z0-9_-]{10,}\.[A-Za-z0-9_-]{10,}\.[A-Za-z0-9_-]{10,}/g, // JWTs
  /\b(gsk|sk|pk|rk)_[A-Za-z0-9_-]{10,}/g, // provider keys
  /\bAIza[0-9A-Za-z_-]{20,}/g, // Google keys
  /[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}/gi, // emails
];

export function redact(value: unknown, depth = 0): unknown {
  if (depth > 5) return "[depth]";
  if (typeof value === "string") {
    return SENSITIVE_VALUE_PATTERNS.reduce((text, pattern) => text.replace(pattern, "[redacted]"), value);
  }
  if (Array.isArray(value)) return value.map((item) => redact(item, depth + 1));
  if (value instanceof Error) return { name: value.name, message: redact(value.message, depth + 1) };
  if (value !== null && typeof value === "object") {
    return Object.fromEntries(
      Object.entries(value).map(([field, fieldValue]) => [
        field,
        SENSITIVE_FIELD.test(field) ? "[redacted]" : redact(fieldValue, depth + 1),
      ]),
    );
  }
  return value;
}

function write(level: LogLevel, event: string, fields: LogFields): void {
  const line = JSON.stringify({
    level,
    event,
    time: new Date().toISOString(),
    ...(redact(fields) as LogFields),
  });
  if (level === "error" || level === "warn") console.error(line);
  else console.log(line);
}

export const logger = {
  debug: (event: string, fields: LogFields = {}) => {
    if (process.env.NODE_ENV !== "production") write("debug", event, fields);
  },
  info: (event: string, fields: LogFields = {}) => {
    write("info", event, fields);
  },
  warn: (event: string, fields: LogFields = {}) => {
    write("warn", event, fields);
  },
  error: (event: string, fields: LogFields = {}) => {
    write("error", event, fields);
  },
};
