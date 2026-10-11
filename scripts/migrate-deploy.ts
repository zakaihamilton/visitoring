import "dotenv/config";
import { createHash } from "node:crypto";
import { readFile } from "node:fs/promises";
import { resolve } from "node:path";
import { Pool, type PoolClient } from "pg";

type MigrationJournal = {
  entries: Array<{ tag: string; when: number }>;
};

type MigrationFile = {
  tag: string;
  when: number;
  hash: string;
  statements: string[];
};

const MIGRATION_SCHEMA = "drizzle";
const MIGRATION_TABLE = "__drizzle_migrations";
const BASELINE_TAG = "0006_eager_living_tribunal";
const ADVISORY_LOCK_KEY = 765_451_231;
const MIGRATIONS_FOLDER = resolve(process.cwd(), "drizzle");
const BASELINE_COLUMNS: Record<string, string[]> = {
  auth_rate_limit_buckets: ["bucket_key", "window_started_at", "count"],
  rate_limit_buckets: ["id", "site_id", "ip_hash", "window_started_at", "count"],
  site_events: [
    "id",
    "workspace_id",
    "site_id",
    "visitor_id",
    "session_id",
    "event_name",
    "path",
    "referrer_host",
    "properties",
    "device",
    "browser",
    "os",
    "country",
    "region",
    "created_at",
  ],
  sites: [
    "id",
    "workspace_id",
    "name",
    "allowed_domains",
    "site_key_hash",
    "site_key_prefix",
    "created_at",
    "updated_at",
  ],
  workspaces: ["id", "name", "organization_id", "created_at"],
};

function getErrorDetails(error: unknown): { code?: string; message: string } {
  if (!(error instanceof Error)) return { message: String(error) };
  const code = "code" in error && typeof error.code === "string" ? error.code : undefined;
  return { code, message: error.message };
}

async function readMigrations(): Promise<MigrationFile[]> {
  const journal = JSON.parse(
    await readFile(resolve(MIGRATIONS_FOLDER, "meta/_journal.json"), "utf8"),
  ) as MigrationJournal;

  return Promise.all(
    journal.entries.map(async (entry) => {
      const sql = await readFile(resolve(MIGRATIONS_FOLDER, `${entry.tag}.sql`), "utf8");
      return {
        tag: entry.tag,
        when: entry.when,
        hash: createHash("sha256").update(sql).digest("hex"),
        statements: sql
          .split("--> statement-breakpoint")
          .map((statement) => statement.trim())
          .filter(Boolean),
      };
    }),
  );
}

async function hasVisitoringTables(client: PoolClient): Promise<boolean> {
  const result = await client.query<{ present: boolean }>(
    `SELECT EXISTS (
       SELECT 1 FROM information_schema.tables
       WHERE table_schema = 'public'
         AND table_name = ANY($1::text[])
     ) AS present`,
    [Object.keys(BASELINE_COLUMNS)],
  );
  return result.rows[0]?.present ?? false;
}

async function isDatabaseAtKnownBaseline(client: PoolClient): Promise<boolean> {
  const result = await client.query<{
    table_name: string;
    column_name: string;
    is_nullable: string;
  }>(
    `SELECT table_name, column_name, is_nullable
     FROM information_schema.columns
     WHERE table_schema = 'public'
       AND table_name = ANY($1::text[])`,
    [Object.keys(BASELINE_COLUMNS)],
  );

  const columnsByTable = new Map<string, Map<string, string>>();
  for (const row of result.rows) {
    const tableColumns = columnsByTable.get(row.table_name) ?? new Map<string, string>();
    tableColumns.set(row.column_name, row.is_nullable);
    columnsByTable.set(row.table_name, tableColumns);
  }

  if (
    Object.entries(BASELINE_COLUMNS).some(([table, columns]) => {
      const actualColumns = columnsByTable.get(table);
      return !actualColumns || columns.some((column) => !actualColumns.has(column));
    })
  ) {
    return false;
  }

  const workspaces = columnsByTable.get("workspaces");
  const siteEvents = columnsByTable.get("site_events");
  return (
    workspaces?.get("organization_id") === "NO" &&
    !workspaces.has("slug") &&
    !siteEvents?.has("source_id")
  );
}

async function recordVerifiedBaseline(
  client: PoolClient,
  migrations: MigrationFile[],
): Promise<number> {
  const baselineIndex = migrations.findIndex((migration) => migration.tag === BASELINE_TAG);
  if (baselineIndex === -1) {
    throw new Error(`Migration journal is missing the expected baseline ${BASELINE_TAG}.`);
  }

  const history = await client.query<{ hash: string; created_at: string | null }>(
    `SELECT hash, created_at::text FROM ${MIGRATION_SCHEMA}.${MIGRATION_TABLE}`,
  );
  const baselineTimestamp = migrations[baselineIndex].when;
  const latestTimestamp = history.rows.reduce(
    (latest, row) => Math.max(latest, Number(row.created_at ?? 0)),
    0,
  );
  if (latestTimestamp >= baselineTimestamp) return latestTimestamp;

  const hasApplicationTables = await hasVisitoringTables(client);
  if (!hasApplicationTables) return latestTimestamp;

  if (!(await isDatabaseAtKnownBaseline(client))) {
    if (history.rows.length === 0) {
      throw new Error(
        "The database has Visitoring tables without migration history and does not match the verified pre-retention schema. Refusing to run legacy migrations against it.",
      );
    }
    return latestTimestamp;
  }

  const recordedByTimestamp = new Map(
    history.rows.map((row) => [Number(row.created_at), row.hash]),
  );
  for (const migration of migrations.slice(0, baselineIndex + 1)) {
    const existingHash = recordedByTimestamp.get(migration.when);
    if (existingHash && existingHash !== migration.hash) {
      throw new Error(
        `Migration history for ${migration.tag} does not match the checked-in migration file.`,
      );
    }
    if (!existingHash) {
      await client.query(
        `INSERT INTO ${MIGRATION_SCHEMA}.${MIGRATION_TABLE} (hash, created_at)
         VALUES ($1, $2)`,
        [migration.hash, migration.when],
      );
    }
  }

  console.info(
    `Verified the existing Visitoring schema and recorded its migration baseline through ${BASELINE_TAG}.`,
  );
  return baselineTimestamp;
}

async function applyMigrations(client: PoolClient, migrations: MigrationFile[]): Promise<void> {
  let latestTimestamp = await recordVerifiedBaseline(client, migrations);

  for (const migration of migrations) {
    if (latestTimestamp >= migration.when) continue;

    for (const statement of migration.statements) {
      await client.query(statement);
    }
    await client.query(
      `INSERT INTO ${MIGRATION_SCHEMA}.${MIGRATION_TABLE} (hash, created_at)
       VALUES ($1, $2)`,
      [migration.hash, migration.when],
    );
    latestTimestamp = migration.when;
    console.info(`Applied database migration ${migration.tag}.`);
  }
}

async function main(): Promise<void> {
  const connectionString = process.env.DATABASE_URL;
  if (!connectionString) {
    throw new Error("DATABASE_URL is required to run production database migrations.");
  }

  const pool = new Pool({ connectionString, max: 1 });
  let client: PoolClient | undefined;
  try {
    client = await pool.connect();
    await client.query("BEGIN");
    try {
      await client.query("SELECT pg_advisory_xact_lock($1)", [ADVISORY_LOCK_KEY]);
      await client.query(`CREATE SCHEMA IF NOT EXISTS ${MIGRATION_SCHEMA}`);
      await client.query(
        `CREATE TABLE IF NOT EXISTS ${MIGRATION_SCHEMA}.${MIGRATION_TABLE} (
          id SERIAL PRIMARY KEY,
          hash text NOT NULL,
          created_at bigint
        )`,
      );
      await applyMigrations(client, await readMigrations());
      await client.query("COMMIT");
    } catch (error) {
      await client.query("ROLLBACK").catch(() => undefined);
      throw error;
    }
    console.info("Database migrations completed successfully.");
  } finally {
    client?.release();
    await pool.end();
  }
}

main().catch((error: unknown) => {
  const details = getErrorDetails(error);
  console.error(`Database migration failed: ${details.message}`);
  if (details.code) console.error(`PostgreSQL error code: ${details.code}`);
  process.exitCode = 1;
});
