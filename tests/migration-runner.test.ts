import type { PoolClient } from "pg";
import { describe, expect, it } from "vitest";
import { applyMigration, parseMigrationSql } from "../scripts/migration-runner";

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

const concurrentIndexSql = `-- visitoring-migration: concurrent-index
CREATE INDEX CONCURRENTLY "site_events_created_at_idx" ON "site_events" USING btree ("created_at");--> statement-breakpoint
CREATE UNIQUE INDEX CONCURRENTLY "sites_site_key_hash_unique" ON "sites" USING btree ("site_key_hash");`;

class FakeMigrationClient {
  indexes = new Map<string, IndexStatus>();
  events: string[] = [];
  hasDuplicates = false;
  failCreateIndexOnce: string | null = null;
  private readonly failedIndexes = new Set<string>();

  async query(
    query: string,
    values: unknown[] = [],
  ): Promise<{ rows: unknown[]; rowCount: number }> {
    const statement = query.trim();
    if (statement.includes("FROM pg_class AS index_class")) {
      const name = String(values[0]);
      this.events.push(`inspect:${name}`);
      return { rows: this.indexes.has(name) ? [this.indexes.get(name)] : [], rowCount: 0 };
    }
    if (statement.startsWith("SELECT EXISTS (")) {
      this.events.push("check-duplicates");
      return { rows: [{ has_duplicates: this.hasDuplicates }], rowCount: 1 };
    }
    if (statement.startsWith("DROP INDEX CONCURRENTLY")) {
      const name = /public\."([a-z0-9_]+)"/i.exec(statement)?.[1];
      if (!name) throw new Error("Fake could not find the dropped index name.");
      this.events.push(`drop:${name}`);
      this.indexes.delete(name);
      return { rows: [], rowCount: 0 };
    }
    if (statement.startsWith("CREATE ") && statement.includes("INDEX CONCURRENTLY")) {
      const match =
        /CREATE (UNIQUE )?INDEX CONCURRENTLY "([a-z0-9_]+)" ON public\."([a-z0-9_]+)" USING btree \("([a-z0-9_]+)"\)/i.exec(
          statement,
        );
      if (!match) throw new Error(`Unexpected concurrent-index SQL: ${statement}`);
      const [, unique, name, table, column] = match;
      this.events.push(`create:${name}`);
      if (this.failCreateIndexOnce === name && !this.failedIndexes.has(name)) {
        this.failedIndexes.add(name);
        this.indexes.set(name, {
          valid: false,
          ready: false,
          is_unique: Boolean(unique),
          has_predicate: false,
          has_expressions: false,
          key_columns: 1,
          total_columns: 1,
          table_name: table,
          table_schema: "public",
          method: "btree",
          columns: [column],
        });
        throw new Error("simulated interrupted concurrent build");
      }
      this.indexes.set(name, {
        valid: true,
        ready: true,
        is_unique: Boolean(unique),
        has_predicate: false,
        has_expressions: false,
        key_columns: 1,
        total_columns: 1,
        table_name: table,
        table_schema: "public",
        method: "btree",
        columns: [column],
      });
      return { rows: [], rowCount: 0 };
    }
    if (statement === "BEGIN" || statement === "COMMIT" || statement === "ROLLBACK") {
      this.events.push(statement.toLowerCase());
      return { rows: [], rowCount: 0 };
    }
    if (statement.startsWith("INSERT INTO drizzle.__drizzle_migrations")) {
      this.events.push("record-migration");
      return { rows: [], rowCount: 1 };
    }
    throw new Error(`Unexpected migration query: ${statement}`);
  }
}

function fakePoolClient(fake: FakeMigrationClient): PoolClient {
  return fake as unknown as PoolClient;
}

function migration() {
  return parseMigrationSql("0008_site_key_and_retention_indexes", 8, concurrentIndexSql);
}

describe("concurrent migration execution", () => {
  it("builds and verifies each index outside a transaction before recording the migration", async () => {
    const fake = new FakeMigrationClient();
    await applyMigration(fakePoolClient(fake), migration());

    expect(fake.indexes.get("site_events_created_at_idx")).toMatchObject({
      valid: true,
      ready: true,
      table_name: "site_events",
      columns: ["created_at"],
    });
    expect(fake.indexes.get("sites_site_key_hash_unique")).toMatchObject({
      valid: true,
      ready: true,
      is_unique: true,
      table_name: "sites",
      columns: ["site_key_hash"],
    });
    expect(fake.events.indexOf("create:site_events_created_at_idx")).toBeLessThan(
      fake.events.indexOf("begin"),
    );
    expect(fake.events.indexOf("create:sites_site_key_hash_unique")).toBeLessThan(
      fake.events.indexOf("begin"),
    );
    expect(fake.events.at(-1)).toBe("commit");
    expect(fake.events).toContain("record-migration");
  });

  it("reuses valid indexes and drops an invalid index left by an interrupted build", async () => {
    const fake = new FakeMigrationClient();
    fake.failCreateIndexOnce = "sites_site_key_hash_unique";

    await expect(applyMigration(fakePoolClient(fake), migration())).rejects.toThrow(
      "simulated interrupted concurrent build",
    );
    expect(fake.events).not.toContain("record-migration");
    expect(fake.indexes.get("site_events_created_at_idx")?.valid).toBe(true);
    expect(fake.indexes.get("sites_site_key_hash_unique")?.valid).toBe(false);

    await applyMigration(fakePoolClient(fake), migration());
    expect(fake.events).toContain("drop:sites_site_key_hash_unique");
    expect(
      fake.events.filter((event) => event === "create:site_events_created_at_idx"),
    ).toHaveLength(1);
    expect(fake.indexes.get("sites_site_key_hash_unique")?.valid).toBe(true);
    expect(fake.events.filter((event) => event === "record-migration")).toHaveLength(1);
  });

  it("stops with a diagnostic before building a duplicate-sensitive index", async () => {
    const fake = new FakeMigrationClient();
    fake.hasDuplicates = true;

    await expect(applyMigration(fakePoolClient(fake), migration())).rejects.toThrow(
      "duplicate values exist in sites.site_key_hash",
    );
    expect(fake.events).not.toContain("create:sites_site_key_hash_unique");
    expect(fake.events).not.toContain("record-migration");
  });

  it("does not accept a valid but partial index as the migration result", async () => {
    const fake = new FakeMigrationClient();
    fake.indexes.set("site_events_created_at_idx", {
      valid: true,
      ready: true,
      is_unique: false,
      has_predicate: true,
      has_expressions: false,
      key_columns: 1,
      total_columns: 1,
      table_name: "site_events",
      table_schema: "public",
      method: "btree",
      columns: ["created_at"],
    });

    await expect(applyMigration(fakePoolClient(fake), migration())).rejects.toThrow(
      "definition different from the migration",
    );
    expect(fake.events).not.toContain("record-migration");
  });

  it("requires an explicit marker and rejects non-index SQL in concurrent migrations", () => {
    expect(() =>
      parseMigrationSql(
        "bad_unmarked",
        1,
        'CREATE INDEX CONCURRENTLY "idx" ON "sites" USING btree ("site_key_hash");',
      ),
    ).toThrow("without its required marker");
    expect(() =>
      parseMigrationSql(
        "bad_marked",
        1,
        "-- visitoring-migration: concurrent-index\nDROP TABLE sites;",
      ),
    ).toThrow("only single-column CREATE INDEX CONCURRENTLY");
  });
});
