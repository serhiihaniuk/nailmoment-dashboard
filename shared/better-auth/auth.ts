import { betterAuth } from "better-auth";
import { drizzleAdapter } from "better-auth/adapters/drizzle";
import { db } from "@/shared/db";
import * as schema from "@/shared/db/schema";

const vercelOrigin = process.env.VERCEL_URL
  ? `https://${process.env.VERCEL_URL}`
  : undefined;

const isProductionDeployment = process.env.VERCEL_ENV === "production";
const isVercelPreviewRuntime =
  !isProductionDeployment && process.env.VERCEL === "1";
const isV0EmbeddedRuntime =
  process.env.VERCEL_URL?.includes("vusercontent.net") ||
  process.env.VERCEL_URL?.includes("v0.dev") ||
  process.env.VERCEL_URL?.includes("v0.app");
const shouldUseEmbeddedPreviewCookies =
  isVercelPreviewRuntime || Boolean(isV0EmbeddedRuntime);

const baseTrustedHosts = [
  "http://localhost:3000",
  "http://127.0.0.1:3000",
  "dashboard.nailmoment.pl",
  "dev.dashboard.nailmoment.pl",
  "nailmoment-dashboard.vercel.app",
  "nailmoment-dashboard-*-serhiihaniuks-projects.vercel.app",
  "nailmoment-dashboard-serhiihaniuks-projects.vercel.app",
  "nailmoment-dashboard-serhiihaniuk-serhiihaniuks-projects.vercel.app",
  process.env.VERCEL_URL,
].filter(Boolean) as string[];

const authBaseURL = isProductionDeployment
  ? (vercelOrigin ?? "https://dashboard.nailmoment.pl")
  : {
      allowedHosts: ["*"],
      fallback: vercelOrigin ?? "https://dev.dashboard.nailmoment.pl",
    };

const v0PreviewOrigins =
  isProductionDeployment
    ? []
    : [
        "https://v0.dev",
        "https://*.v0.dev",
        "https://v0.app",
        "https://*.v0.app",
        "https://*.vusercontent.net",
        "https://lite.vusercontent.net",
        "https://*.lite.vusercontent.net",
        "https://generated.vusercontent.net",
      ];

const staticTrustedOrigins = [
  ...baseTrustedHosts.map((host) =>
    host.includes("://") ? host : `https://${host}`,
  ),
  vercelOrigin,
  ...v0PreviewOrigins,
].filter(Boolean) as string[];

function getOriginFromURL(value: string | null) {
  if (!value) {
    return undefined;
  }

  try {
    return new URL(value).origin;
  } catch {
    return undefined;
  }
}

const trustedOrigins = isProductionDeployment
  ? staticTrustedOrigins
  : (request?: Request) => [
      ...staticTrustedOrigins,
      getOriginFromURL(request?.headers.get("origin") ?? null),
      getOriginFromURL(request?.headers.get("referer") ?? null),
    ];

export const auth = betterAuth({
  baseURL: authBaseURL,
  emailAndPassword: {
    enabled: true,
    disableSignUp: true,
  },
  advanced: shouldUseEmbeddedPreviewCookies
    ? {
        defaultCookieAttributes: {
          sameSite: "none",
          secure: true,
        },
      }
    : undefined,
  trustedOrigins,
  database: drizzleAdapter(db, {
    provider: "pg",
    schema,
  }),
});
