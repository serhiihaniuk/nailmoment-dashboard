import "dotenv/config";
import { drizzle } from "drizzle-orm/neon-http";
import { neon } from "@neondatabase/serverless";
import { readDatabaseUrl } from "@/shared/config/env";

const sql = neon(readDatabaseUrl());
export const db = drizzle({ client: sql });
export type DrizzleDB = typeof db;
