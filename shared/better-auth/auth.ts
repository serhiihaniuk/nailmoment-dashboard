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

const dynamicBaseURLAllowedHosts = [
  "localhost:3000",
  "127.0.0.1:3000",
  "dashboard.nailmoment.pl",
  "dev.dashboard.nailmoment.pl",
  "nailmoment-dashboard.vercel.app",
  "nailmoment-dashboard-*-serhiihaniuks-projects.vercel.app",
  "nailmoment-dashboard-serhiihaniuks-projects.vercel.app",
  "nailmoment-dashboard-serhiihaniuk-serhiihaniuks-projects.vercel.app",
  process.env.VERCEL_URL,
  "v0.dev",
  "*.v0.dev",
  "v0.app",
  "*.v0.app",
  "*.vusercontent.net",
  "lite.vusercontent.net",
  "*.lite.vusercontent.net",
  "generated.vusercontent.net",
].filter(Boolean) as string[];

const authBaseURL = isProductionDeployment
  ? (vercelOrigin ?? "https://dashboard.nailmoment.pl")
  : {
      allowedHosts: dynamicBaseURLAllowedHosts,
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

const trustedOrigins = [
  "http://localhost:3000",
  "http://127.0.0.1:3000",
  "https://dashboard.nailmoment.pl",
  "https://dev.dashboard.nailmoment.pl",
  "https://nailmoment-dashboard.vercel.app",
  "https://nailmoment-dashboard-*-serhiihaniuks-projects.vercel.app",
  "https://nailmoment-dashboard-serhiihaniuks-projects.vercel.app",
  "https://nailmoment-dashboard-serhiihaniuk-serhiihaniuks-projects.vercel.app",
  vercelOrigin,
  ...v0PreviewOrigins,
].filter(Boolean) as string[];

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
