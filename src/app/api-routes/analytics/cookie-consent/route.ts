import { nanoid } from "nanoid";
import { NextRequest, NextResponse } from "next/server";

import { readRequestJson } from "@/app/api-routes/lib/request";
import { getDashboardSession } from "@/shared/better-auth/auth";
import { db } from "@/shared/db";
import { createCookieConsentAnalyticsService } from "@/shared/db/service/cookie-consent-analytics-service";
import { cookieConsentEventClientSchema } from "@/shared/db/schema.zod";

const analyticsService = createCookieConsentAnalyticsService(db);

const PRODUCTION_ORIGINS = new Set([
  "https://nailmoment.pl",
  "https://www.nailmoment.pl",
]);

function isAllowedOrigin(origin: string | null) {
  if (!origin) {
    return false;
  }

  if (PRODUCTION_ORIGINS.has(origin)) {
    return true;
  }

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
      status: 403,
      headers: corsHeaders(origin),
    });
  }

  return new NextResponse(null, {
    status: 204,
    headers: corsHeaders(origin),
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

  const parsed = cookieConsentEventClientSchema.safeParse(json.data ?? {});

  if (!parsed.success) {
    return jsonWithCors(
      origin,
      { message: "Validation failed", errors: parsed.error.issues },
      { status: 400 }
    );
  }

  await analyticsService.addEvent({
    id: nanoid(16),
    action: parsed.data.action,
    consent_version: parsed.data.consentVersion,
    marketing: parsed.data.marketing,
    necessary: true,
    source: "nailmoment.pl",
    surface: parsed.data.surface,
  });

  return jsonWithCors(origin, { ok: true }, { status: 201 });
}

export async function GET() {
  const session = await getDashboardSession();

  if (!session) {
    return NextResponse.json({ message: "Unauthorized" }, { status: 401 });
  }

  const analytics = await analyticsService.getAnalytics();
  return NextResponse.json(analytics, { status: 200 });
}

export const dynamic = "force-dynamic";
