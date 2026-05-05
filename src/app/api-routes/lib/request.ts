import { NextResponse } from "next/server";
import { z } from "zod";

/**
 * Shared helpers for Next route handlers.
 *
 * Keep request.json(), route params, and Zod error formatting centralized here
 * so API routes do not need local casts like `as z.ZodError`.
 */
type ApiParseResult<T> =
  | { ok: true; data: T; raw: unknown }
  | { ok: false; response: NextResponse };

/** Read JSON without letting malformed bodies fall into generic 500 handlers. */
export async function readRequestJson(request: Request): Promise<
  | { ok: true; data: unknown }
  | { ok: false; response: NextResponse }
> {
  try {
    return { ok: true, data: await request.json() };
  } catch {
    return {
      ok: false,
      response: NextResponse.json(
        { message: "Invalid JSON body" },
        { status: 400 }
      ),
    };
  }
}

/**
 * Parse an API JSON body and preserve the existing response shape chosen by
 * each route through `issueKey` or `errorFormat`.
 */
export async function parseRequestJson<TSchema extends z.ZodTypeAny>(
  request: Request,
  schema: TSchema,
  options: {
    errorFormat?: "fieldErrors" | "issues";
    issueKey?: "error" | "errors" | "issues";
  } = {}
): Promise<ApiParseResult<z.output<TSchema>>> {
  const json = await readRequestJson(request);
  if (!json.ok) return json;

  const parsed = schema.safeParse(json.data ?? {});
  if (!parsed.success) {
    return {
      ok: false,
      response:
        options.errorFormat === "fieldErrors"
          ? fieldValidationErrorResponse(parsed.error)
          : validationErrorResponse(parsed.error, options),
    };
  }

  return {
    ok: true,
    data: parsed.data,
    raw: json.data,
  };
}

/** Parse promised Next route params with the same success/error shape as bodies. */
export async function parseRouteParams<TSchema extends z.ZodTypeAny>(
  params: Promise<unknown>,
  schema: TSchema
): Promise<ApiParseResult<z.output<TSchema>>> {
  const raw = await params;
  const parsed = schema.safeParse(raw);
  if (!parsed.success) {
    return {
      ok: false,
      response: validationErrorResponse(parsed.error),
    };
  }

  return {
    ok: true,
    data: parsed.data,
    raw,
  };
}

/** Return `{ message, issues|error|errors }` for routes that expose Zod issues. */
export function validationErrorResponse(
  error: z.ZodError,
  options: { issueKey?: "error" | "errors" | "issues" } = {}
) {
  const issueKey = options.issueKey ?? "issues";

  return NextResponse.json(
    { message: "Validation failed", [issueKey]: error.issues },
    { status: 400 }
  );
}

/** Return flattened field errors for legacy routes that already expose them. */
export function fieldValidationErrorResponse(error: z.ZodError) {
  return NextResponse.json(
    { message: "Validation failed", errors: error.flatten().fieldErrors },
    { status: 400 }
  );
}

/** Safe Object.keys for PATCH handlers that receive unknown parsed JSON. */
export function objectKeys(value: unknown): string[] {
  return value && typeof value === "object" && !Array.isArray(value)
    ? Object.keys(value)
    : [];
}
