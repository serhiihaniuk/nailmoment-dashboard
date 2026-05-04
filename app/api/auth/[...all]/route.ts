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
  let response: Response;
  try {
    response = await auth.handler(request);
  } catch (error) {
    console.error("[auth] handler failed", {
      url: request.url,
      host: request.headers.get("host"),
      forwardedHost: request.headers.get("x-forwarded-host"),
      origin: request.headers.get("origin"),
      referer: request.headers.get("referer"),
      error,
    });

    if (process.env.VERCEL_ENV === "production") {
      return new Response("Internal Server Error", { status: 500 });
    }

    return Response.json(
      {
        message: error instanceof Error ? error.message : String(error),
        stack: error instanceof Error ? error.stack : undefined,
      },
      { status: 500 },
    );
  }

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
