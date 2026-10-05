import { drizzle } from "drizzle-orm/node-postgres";
import { Pool } from "pg";
import * as schema from "./schema";

const databaseUrl =
  process.env.DATABASE_URL ?? "postgres://visitoring:visitoring@localhost:5432/visitoring";
export const pool = new Pool({ connectionString: databaseUrl, max: 10, idleTimeoutMillis: 30_000 });
export const db = drizzle(pool, { schema });
