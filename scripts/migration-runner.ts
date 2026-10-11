import { createHash } from "node:crypto";
import type { PoolClient } from "pg";

const MIGRATION_SCHEMA = "drizzle";
const MIGRATION_TABLE = "__drizzle_migrations";

export type MigrationFile = {
  tag: string;
  when: number;
  hash: string;
  statements: string[];
  mode: "transactional" | "concurrent-index";
};

type IndexSpec = {
  name: string;
  table: string;
  column: string;
  unique: boolean;
};

type IndexStatus = {
  valid: boolean;
  ready: boolean;
  is_unique: boolean;
  has_predicate: boolean;
  has_expressions: boolean;
  key_columns: number;
  total_columns: number;
  table_name: string;
  table_schema: string;
  method: string;
  columns: string[];
};

const concurrentIndexPattern =
  /^CREATE\s+(UNIQUE\s+)?INDEX\s+CONCURRENTLY\s+"?([a-z][a-z0-9_]*)"?\s+ON\s+(?:"?([a-z][a-z0-9_]*)"?\.)?"?([a-z][a-z0-9_]*)"?\s+USING\s+btree\s*\(\s*"?([a-z][a-z0-9_]*)"?\s*\)\s*;?$/i;

function parseIndexStatement(statement: string): IndexSpec {
  const match = concurrentIndexPattern.exec(statement.trim());
  if (!match) {
    throw new Error(
      "Concurrent-index migrations may contain only single-column CREATE INDEX CONCURRENTLY statements using btree.",
    );
  }
  const [, unique, name, schema = "public", table, column] = match;
  if (schema.toLowerCase() !== "public") {
    throw new Error("Concurrent-index migrations may target only the public schema.");
  }
  return { name, table, column, unique: Boolean(unique) };
}

export function parseMigrationSql(tag: string, when: number, contents: string): MigrationFile {
  const markerPattern = /^\s*-- visitoring-migration: concurrent-index\s*(?:\r?\n|$)/;
  const marker = markerPattern.exec(contents);
  const hasMarkerText = contents.includes("visitoring-migration:");
  if (hasMarkerText && !marker) {
    throw new Error(`Migration ${tag} has a malformed or misplaced migration marker.`);
  }

  const mode = marker ? "concurrent-index" : "transactional";
  const body = marker ? contents.slice(marker[0].length) : contents;
  const statements = body
    .split("--> statement-breakpoint")
    .map((statement) => statement.trim())
    .filter(Boolean);
  if (statements.length === 0) throw new Error(`Migration ${tag} contains no SQL statements.`);

  if (mode === "concurrent-index") {
    for (const statement of statements) parseIndexStatement(statement);
  } else if (statements.some((statement) => /\bINDEX\s+CONCURRENTLY\b/i.test(statement))) {
    throw new Error(`Migration ${tag} uses concurrent index creation without its required marker.`);
  }

  return {
    tag,
    when,
    hash: createHash("sha256").update(contents).digest("hex"),
    statements,
    mode,
  };
}

function quoteIdentifier(identifier: string): string {
  if (!/^[a-z][a-z0-9_]*$/i.test(identifier)) {
    throw new Error("A concurrent index migration contains an invalid SQL identifier.");
  }
  return `"${identifier}"`;
}

async function inspectIndex(client: PoolClient, indexName: string): Promise<IndexStatus | null> {
  const result = await client.query<IndexStatus>(
    `SELECT index_meta.indisvalid AS valid,
            index_meta.indisready AS ready,
            index_meta.indisunique AS is_unique,
            index_meta.indpred IS NOT NULL AS has_predicate,
            index_meta.indexprs IS NOT NULL AS has_expressions,
            index_meta.indnkeyatts AS key_columns,
            index_meta.indnatts AS total_columns,
            table_class.relname AS table_name,
            table_namespace.nspname AS table_schema,
            access_method.amname AS method,
            ARRAY(
              SELECT attribute.attname::text
              FROM unnest(index_meta.indkey) WITH ORDINALITY AS index_column(attnum, ordinality)
              JOIN pg_attribute AS attribute
                ON attribute.attrelid = table_class.oid
               AND attribute.attnum = index_column.attnum
              ORDER BY index_column.ordinality
            ) AS columns
     FROM pg_class AS index_class
     JOIN pg_namespace AS index_namespace ON index_namespace.oid = index_class.relnamespace
     JOIN pg_index AS index_meta ON index_meta.indexrelid = index_class.oid
     JOIN pg_class AS table_class ON table_class.oid = index_meta.indrelid
     JOIN pg_namespace AS table_namespace ON table_namespace.oid = table_class.relnamespace
     JOIN pg_am AS access_method ON access_method.oid = index_class.relam
     WHERE index_namespace.nspname = 'public' AND index_class.relname = $1`,
    [indexName],
  );
  return result.rows[0] ?? null;
}

function indexMatches(status: IndexStatus, spec: IndexSpec): boolean {
  return (
    status.valid &&
    status.ready &&
    status.is_unique === spec.unique &&
    !status.has_predicate &&
    !status.has_expressions &&
    status.key_columns === 1 &&
    status.total_columns === 1 &&
    status.table_name === spec.table &&
    status.table_schema === "public" &&
    status.method === "btree" &&
    status.columns.length === 1 &&
    status.columns[0] === spec.column
  );
}

async function hasDuplicateValues(client: PoolClient, spec: IndexSpec): Promise<boolean> {
  if (!spec.unique) return false;
  const table = quoteIdentifier(spec.table);
  const column = quoteIdentifier(spec.column);
  const result = await client.query<{ has_duplicates: boolean }>(
    `SELECT EXISTS (
       SELECT 1 FROM public.${table}
       GROUP BY ${column}
       HAVING count(*) > 1
       LIMIT 1
     ) AS has_duplicates`,
  );
  return result.rows[0]?.has_duplicates ?? false;
}

async function ensureConcurrentIndex(client: PoolClient, spec: IndexSpec): Promise<void> {
  const existing = await inspectIndex(client, spec.name);
  if (existing && indexMatches(existing, spec)) return;
  if (existing?.valid && existing.ready) {
    throw new Error(
      `Index ${spec.name} already exists with a definition different from the migration. Refusing to replace it.`,
    );
  }
  if (existing) {
    await client.query(`DROP INDEX CONCURRENTLY IF EXISTS public.${quoteIdentifier(spec.name)}`);
  }

  if (await hasDuplicateValues(client, spec)) {
    throw new Error(
      `Cannot create unique index ${spec.name}: duplicate values exist in ${spec.table}.${spec.column}. Resolve them before retrying the migration.`,
    );
  }

  const unique = spec.unique ? "UNIQUE " : "";
  try {
    await client.query(
      `CREATE ${unique}INDEX CONCURRENTLY ${quoteIdentifier(spec.name)} ON public.${quoteIdentifier(spec.table)} USING btree (${quoteIdentifier(spec.column)})`,
    );
  } catch (error) {
    if (spec.unique && error instanceof Error && "code" in error && error.code === "23505") {
      throw new Error(
        `Cannot create unique index ${spec.name}: duplicate values appeared in ${spec.table}.${spec.column} during the concurrent build. Resolve them before retrying the migration.`,
      );
    }
    throw error;
  }

  const created = await inspectIndex(client, spec.name);
  if (!created || !indexMatches(created, spec)) {
    throw new Error(`Concurrent index ${spec.name} was not created with the expected definition.`);
  }
}

async function inTransaction(client: PoolClient, action: () => Promise<void>): Promise<void> {
  await client.query("BEGIN");
  try {
    await action();
    await client.query("COMMIT");
  } catch (error) {
    await client.query("ROLLBACK").catch(() => undefined);
    throw error;
  }
}

async function recordMigration(client: PoolClient, migration: MigrationFile): Promise<void> {
  await client.query(
    `INSERT INTO ${MIGRATION_SCHEMA}.${MIGRATION_TABLE} (hash, created_at)
     VALUES ($1, $2)`,
    [migration.hash, migration.when],
  );
}

export async function applyMigration(client: PoolClient, migration: MigrationFile): Promise<void> {
  if (migration.mode === "transactional") {
    await inTransaction(client, async () => {
      for (const statement of migration.statements) await client.query(statement);
      await recordMigration(client, migration);
    });
    return;
  }

  for (const statement of migration.statements) {
    await ensureConcurrentIndex(client, parseIndexStatement(statement));
  }
  await inTransaction(client, () => recordMigration(client, migration));
}
