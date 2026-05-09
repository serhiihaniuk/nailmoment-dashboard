import { config } from "dotenv";

import { defineConfig } from "drizzle-kit";
import { readDatabaseUrl, readOptionalEnv } from "./src/shared/config/env";

config({ path: ".env.local" });
config();

export default defineConfig({
  out: "./drizzle",
  schema: "./src/shared/db/schema.ts",
  dialect: "postgresql",
  dbCredentials: {
    url: readOptionalEnv("POSTGRES_URL") ?? readDatabaseUrl(),
  },
});
