import { betterAuth } from "better-auth";
import { drizzleAdapter } from "better-auth/adapters/drizzle";
import { headers } from "next/headers";
import { db } from "@/shared/db";
import * as schema from "@/shared/db/schema";
import { readVercelUrl } from "@/shared/config/env";

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

export async function getDashboardSession(): Promise<DashboardSession> {
  return auth.api.getSession({ headers: await headers() });
}
