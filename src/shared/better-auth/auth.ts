import { betterAuth } from "better-auth";
import { drizzleAdapter } from "better-auth/adapters/drizzle";
import { admin } from "better-auth/plugins";
import { headers } from "next/headers";
import { db } from "@/shared/db";
import * as schema from "@/shared/db/schema";
import { readVercelUrl } from "@/shared/config/env";
import {
  dashboardAccessControl,
  dashboardRoles,
} from "@/shared/better-auth/permissions";
import { DASHBOARD_ROLE, readDashboardRoleFromSession } from "./roles";

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
  plugins: [
    admin({
      ac: dashboardAccessControl,
      roles: dashboardRoles,
      defaultRole: DASHBOARD_ROLE.CHECK_IN,
      adminRoles: [DASHBOARD_ROLE.ADMIN],
    }),
  ],
});

type DashboardSession = Awaited<ReturnType<typeof auth.api.getSession>>;

export type { DashboardSession };

export async function getAnyDashboardSession(): Promise<DashboardSession> {
  return auth.api.getSession({ headers: await headers() });
}

export async function getDashboardSession(): Promise<DashboardSession> {
  const session = await getAnyDashboardSession();
  if (!session) return null;

  return readDashboardRoleFromSession(session) === DASHBOARD_ROLE.ADMIN
    ? session
    : null;
}
