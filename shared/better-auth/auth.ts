import { betterAuth } from "better-auth";
import { drizzleAdapter } from "better-auth/adapters/drizzle";
import { db } from "@/shared/db";
import * as schema from "@/shared/db/schema";

const trustedOrigins =
  process.env.NODE_ENV === "production"
    ? undefined
    : ["http://localhost:3000", "http://127.0.0.1:3000"];

export const auth = betterAuth({
  emailAndPassword: {
    enabled: true,
    disableSignUp: true,
  },
  trustedOrigins,
  database: drizzleAdapter(db, {
    provider: "pg",
    schema,
  }),
});
