import { betterAuth } from "better-auth";
import { drizzleAdapter } from "better-auth/adapters/drizzle";
import { headers } from "next/headers";
import { db } from "@/shared/db";
import * as schema from "@/shared/db/schema";
import { readVercelUrl } from "@/shared/config/env";
import { isBetterAuthDisabledForDev } from "./dev-bypass";

const vercelUrl = readVercelUrl();
const vercelOrigin = vercelUrl ? `https://${vercelUrl}` : undefined;

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
].filter((origin): origin is string => Boolean(origin));

export const auth = betterAuth({
  baseURL: vercelOrigin ?? "https://dashboard.nailmoment.pl",
  emailAndPassword: {
    enabled: true,
    disableSignUp: true,
  },
  session: {
    cookieCache: {
      enabled: true,
      maxAge: 120,
      strategy: "compact",
    },
  },
  trustedOrigins,
  database: drizzleAdapter(db, {
    provider: "pg",
    schema,
  }),
});

type DashboardSession = Awaited<ReturnType<typeof auth.api.getSession>>;
type ActiveDashboardSession = Exclude<DashboardSession, null>;

const devBypassCreatedAt = new Date("2026-05-08T00:00:00.000Z");
const devBypassExpiresAt = new Date("2099-01-01T00:00:00.000Z");

const devBypassSession = {
  session: {
    createdAt: devBypassCreatedAt,
    expiresAt: devBypassExpiresAt,
    id: "dev-better-auth-bypass-session",
    ipAddress: "127.0.0.1",
    token: "dev-better-auth-bypass-token",
    updatedAt: devBypassCreatedAt,
    userAgent: "dev-better-auth-bypass",
    userId: "dev-better-auth-bypass-user",
  },
  user: {
    createdAt: devBypassCreatedAt,
    email: "dev-bypass@nailmoment.local",
    emailVerified: true,
    id: "dev-better-auth-bypass-user",
    image: null,
    name: "Dev Auth Bypass",
    updatedAt: devBypassCreatedAt,
  },
} satisfies ActiveDashboardSession;

export async function getDashboardSession(): Promise<DashboardSession> {
  const requestHeaders = await headers();
  const hostname =
    requestHeaders.get("x-forwarded-host") ?? requestHeaders.get("host");

  if (isBetterAuthDisabledForDev({ hostname })) {
    return devBypassSession;
  }

  return auth.api.getSession({ headers: requestHeaders });
}
