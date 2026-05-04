import { auth } from "@/shared/better-auth/auth";
import { splitSetCookieHeader } from "better-auth/cookies";

const EMBEDDED_PREVIEW_HOST_MARKERS = [
  "v0.dev",
  "v0.app",
  "vusercontent.net",
];

function isEmbeddedPreviewRequest(request: Request) {
  const requestUrl = new URL(request.url);
  const values = [
    requestUrl.host,
    request.headers.get("host"),
    request.headers.get("x-forwarded-host"),
    request.headers.get("origin"),
    request.headers.get("referer"),
  ].filter((value): value is string => Boolean(value));

  return values.some((value) =>
    EMBEDDED_PREVIEW_HOST_MARKERS.some((marker) =>
      value.toLowerCase().includes(marker),
    ),
  );
}

function makeCookieEmbeddable(cookie: string) {
  let updated = cookie;

  if (/;\s*SameSite=/i.test(updated)) {
    updated = updated.replace(/;\s*SameSite=[^;]*/i, "; SameSite=None");
  } else {
    updated += "; SameSite=None";
  }

  if (!/;\s*Secure/i.test(updated)) {
    updated += "; Secure";
  }

  if (!/;\s*Partitioned/i.test(updated)) {
    updated += "; Partitioned";
  }

  return updated;
}

async function handleAuth(request: Request) {
  const response = await auth.handler(request);

  if (!isEmbeddedPreviewRequest(request)) {
    return response;
  }

  const setCookie = response.headers.get("set-cookie");
  if (!setCookie) {
    return response;
  }

  const headers = new Headers(response.headers);
  headers.delete("set-cookie");
  for (const cookie of splitSetCookieHeader(setCookie)) {
    headers.append("set-cookie", makeCookieEmbeddable(cookie));
  }

  return new Response(response.body, {
    status: response.status,
    statusText: response.statusText,
    headers,
  });
}

export const GET = handleAuth;
export const POST = handleAuth;
