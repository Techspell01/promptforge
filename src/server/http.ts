import "server-only";
import type { z } from "zod";
import { serverEnvironment } from "./env";
import { logger } from "./logger";
import { appError, failure, statusForError, success, type AppError, type Result } from "./result";

const MAX_BODY_BYTES = 64 * 1024;

function corsHeaders(request: Request): Record<string, string> {
  const origin = request.headers.get("origin");
  if (!origin || !serverEnvironment().CORS_ALLOWED_ORIGINS.includes(origin)) return {};
  return {
    "Access-Control-Allow-Origin": origin,
    "Access-Control-Allow-Methods": "GET, POST, PATCH, PUT, DELETE, OPTIONS",
    "Access-Control-Allow-Headers": "authorization, content-type",
    "Access-Control-Max-Age": "600",
    Vary: "Origin",
  };
}

export function preflight(request: Request): Response {
  return new Response(null, { status: 204, headers: corsHeaders(request) });
}

export function jsonResponse(request: Request, body: unknown, status = 200): Response {
  return Response.json(body, { status, headers: { ...corsHeaders(request), "Cache-Control": "no-store" } });
}

export function errorResponse(request: Request, error: AppError): Response {
  const headers: Record<string, string> = { ...corsHeaders(request), "Cache-Control": "no-store" };
  if (error.retryAfterSeconds !== undefined) headers["Retry-After"] = String(error.retryAfterSeconds);
  const body = { error: { code: error.code, message: error.message, fieldErrors: error.fieldErrors } };
  return Response.json(body, { status: statusForError(error), headers });
}

export function streamResponse(request: Request, stream: ReadableStream<Uint8Array>): Response {
  return new Response(stream, {
    headers: {
      ...corsHeaders(request),
      "Content-Type": "application/x-ndjson; charset=utf-8",
      "Cache-Control": "no-store",
      "X-Content-Type-Options": "nosniff",
    },
  });
}

function fieldErrors(error: z.ZodError): Record<string, string> {
  const errors: Record<string, string> = {};
  for (const issue of error.issues) {
    const path = issue.path.join(".") || "body";
    errors[path] ??= issue.message;
  }
  return errors;
}

export function validate<Schema extends z.ZodType>(schema: Schema, value: unknown): Result<z.infer<Schema>> {
  const parsed = schema.safeParse(value);
  return parsed.success
    ? success(parsed.data)
    : failure(appError("invalid_input", { fieldErrors: fieldErrors(parsed.error) }));
}

export async function readJson<Schema extends z.ZodType>(
  request: Request,
  schema: Schema,
): Promise<Result<z.infer<Schema>>> {
  const declaredLength = Number(request.headers.get("content-length") ?? "0");
  if (declaredLength > MAX_BODY_BYTES)
    return failure(appError("invalid_input", { fieldErrors: { body: "Request too large." } }));
  let text: string;
  try {
    text = await request.text();
  } catch {
    return failure(appError("invalid_input"));
  }
  if (new TextEncoder().encode(text).byteLength > MAX_BODY_BYTES) {
    return failure(appError("invalid_input", { fieldErrors: { body: "Request too large." } }));
  }
  let body: unknown;
  try {
    body = JSON.parse(text);
  } catch {
    return failure(appError("invalid_input", { fieldErrors: { body: "Body must be JSON." } }));
  }
  return validate(schema, body);
}

/** Every route goes through here so unexpected errors are logged once and never leak to the client. */
export async function handle(
  request: Request,
  route: string,
  run: () => Promise<Response>,
): Promise<Response> {
  try {
    return await run();
  } catch (error) {
    logger.error("route.unhandled", { route, error });
    return errorResponse(request, appError("internal"));
  }
}
