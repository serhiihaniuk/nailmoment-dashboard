import { betterAuth } from "better-auth";
import { drizzleAdapter } from "better-auth/adapters/drizzle";
import { db } from "@/shared/db";
import * as schema from "@/shared/db/schema";

const vercelOrigin = process.env.VERCEL_URL
  ? `https://${process.env.VERCEL_URL}`
  : undefined;

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
].filter(Boolean) as string[];

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
