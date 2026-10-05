import "dotenv/config";
import { Client, type QueryResult } from "pg";
import { eq } from "drizzle-orm";
import { db, pool } from "@/db";
import { siteEvents, sites } from "@/db/schema";
import { retentionCutoff } from "@/lib/retention";
import { parseArgs, requiredArg } from "./args";
import { toImportedEvent, type SourceTelemetryEvent } from "./import-utils";

async function main(): Promise<void> {
  const args = parseArgs(process.argv.slice(2));
  const siteId = requiredArg(args, "site-id");
  const sourceUrl = process.env.SENTRY8_DATABASE_URL;
  if (!sourceUrl)
    throw new Error("Set SENTRY8_DATABASE_URL to a read-only Sentry8 database connection.");
  const [site] = await db.select().from(sites).where(eq(sites.id, siteId)).limit(1);
  if (!site) throw new Error(`Visitoring site ${siteId} was not found.`);

  const source = new Client({
    connectionString: sourceUrl,
    application_name: "visitoring-sentry8-import-read-only",
    options: "-c default_transaction_read_only=on",
  });
  await source.connect();
  let imported = 0;
  let skipped = 0;
  let duplicates = 0;
  const cutoff = retentionCutoff();

  try {
    await source.query("BEGIN READ ONLY");
    const oldCount = await source.query<{ count: string }>(
      "select count(*)::text as count from telemetry_events where created_at < $1",
      [cutoff],
    );
    skipped = Number(oldCount.rows[0]?.count ?? 0);
    let lastCreatedAt: string | null = null;
    let lastId: string | null = null;

    while (true) {
      const page: QueryResult<SourceTelemetryEvent> =
        lastCreatedAt && lastId
          ? await source.query<SourceTelemetryEvent>(
              `select id::text, anonymous_id, session_id, event_name, path, referrer_host, properties, created_at::text as created_at
           from telemetry_events where created_at >= $1 and (created_at, id) > ($2, $3)
           order by created_at asc, id asc limit 1000`,
              [cutoff, lastCreatedAt, lastId],
            )
          : await source.query<SourceTelemetryEvent>(
              `select id::text, anonymous_id, session_id, event_name, path, referrer_host, properties, created_at::text as created_at
           from telemetry_events where created_at >= $1 order by created_at asc, id asc limit 1000`,
              [cutoff],
            );
      if (page.rows.length === 0) break;

      const rows = page.rows.map((event) => toImportedEvent(event, site));
      const inserted = await db
        .insert(siteEvents)
        .values(rows)
        .onConflictDoNothing({
          target: [siteEvents.siteId, siteEvents.sourceId],
        })
        .returning({ id: siteEvents.id });
      imported += inserted.length;
      duplicates += rows.length - inserted.length;
      const last: SourceTelemetryEvent | undefined = page.rows[page.rows.length - 1];
      if (!last) break;
      lastCreatedAt = last.created_at;
      lastId = last.id;
    }
    await source.query("COMMIT");
  } catch (error) {
    await source.query("ROLLBACK").catch(() => undefined);
    throw error;
  } finally {
    await source.end();
  }

  console.log(`Sentry8 import for site ${site.name} (${site.id})`);
  console.log(`Imported: ${imported}`);
  console.log(`Skipped outside 24 month retention: ${skipped}`);
  console.log(`Duplicates already imported: ${duplicates}`);
}

main()
  .catch((error: unknown) => {
    console.error(error instanceof Error ? error.message : error);
    process.exitCode = 1;
  })
  .finally(() => pool.end());
