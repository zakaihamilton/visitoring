import { config as loadEnv } from "dotenv";
import { defineConfig } from "drizzle-kit";

loadEnv({ path: [".env.local", ".env"] });

export default defineConfig({
  schema: "./src/db/schema.ts",
  dialect: "postgresql",
  dbCredentials: {
    url: process.env.LOCAL_DATABASE_URL ?? "postgres://visitoring:visitoring@localhost:5433/visitoring",
  },
  strict: true,
  verbose: true,
});
