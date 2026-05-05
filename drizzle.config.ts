import "dotenv/config";

import { defineConfig } from "drizzle-kit";
import { readPostgresUrl } from "./src/shared/config/env";

export default defineConfig({
  out: "./drizzle",
  schema: "./shared/db/schema.ts",
  dialect: "postgresql",
  dbCredentials: {
    url: readPostgresUrl(),
  },
});
