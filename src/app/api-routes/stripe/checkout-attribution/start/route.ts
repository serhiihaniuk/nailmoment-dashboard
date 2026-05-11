import { NextRequest, NextResponse } from "next/server";

import { readRequestJson } from "@/app/api-routes/lib/request";
import { db } from "@/shared/db";
import { createTicketAttributionService } from "@/shared/db/service/ticket-attribution-service";
import { checkoutAttributionStartClientSchema } from "@/shared/db/schema.zod";

const attributionService = createTicketAttributionService(db);

const ALLOWED_ORIGINS = new Set([
  "https://nailmoment.pl",
  "https://www.nailmoment.pl",
]);

function isAllowedOrigin(origin: string | null) {
  if (!origin) return false;

  if (ALLOWED_ORIGINS.has(origin)) return true;

  try {
    const url = new URL(origin);
    return (
      url.protocol === "http:" &&
      (url.hostname === "localhost" || url.hostname === "127.0.0.1")
    );
  } catch {
    return false;
  }
}

function corsHeaders(origin: string | null) {
  const headers = new Headers({
    "Access-Control-Allow-Headers": "Content-Type",
    "Access-Control-Allow-Methods": "POST, OPTIONS",
    "Access-Control-Max-Age": "86400",
    Vary: "Origin",
  });

  if (origin && isAllowedOrigin(origin)) {
    headers.set("Access-Control-Allow-Origin", origin);
  }

  return headers;
}

function jsonWithCors(
  origin: string | null,
  body: unknown,
  init: ResponseInit
) {
  return NextResponse.json(body, {
    ...init,
    headers: corsHeaders(origin),
  });
}

export async function OPTIONS(request: NextRequest) {
  const origin = request.headers.get("origin");

  if (!isAllowedOrigin(origin)) {
    return new NextResponse(null, {
      headers: corsHeaders(origin),
      status: 403,
    });
  }

  return new NextResponse(null, {
    headers: corsHeaders(origin),
    status: 204,
  });
}

export async function POST(request: NextRequest) {
  const origin = request.headers.get("origin");

  if (!isAllowedOrigin(origin)) {
    return jsonWithCors(origin, { message: "Forbidden origin" }, { status: 403 });
  }

  const json = await readRequestJson(request);
  if (!json.ok) {
    return jsonWithCors(origin, { message: "Invalid JSON body" }, { status: 400 });
  }

  const parsed = checkoutAttributionStartClientSchema.safeParse(json.data ?? {});

  if (!parsed.success) {
    return jsonWithCors(
      origin,
      { errors: parsed.error.issues, message: "Validation failed" },
      { status: 400 }
    );
  }

  const attribution = await attributionService.createCheckoutAttributionStart(
    parsed.data
  );

  return jsonWithCors(
    origin,
    {
      attributionId: attribution.id,
      clientReferenceId: attribution.client_reference_id,
      ok: true,
    },
    { status: 201 }
  );
}

export const dynamic = "force-dynamic";
