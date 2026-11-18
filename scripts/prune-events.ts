import { config as loadEnv } from "dotenv";
import { endDatabasePools, getPool } from "@/db";
import { pruneExpiredData, retentionCutoff } from "@/lib/retention";

loadEnv({ path: [".env.local", ".env"] });

async function main(): Promise<void> {
  const pool = await getPool();
  const cutoff = retentionCutoff();
  const { removedEvents, removedBuckets, removedLoginBuckets } = await pruneExpiredData(cutoff);
  console.log(`Pruned ${removedEvents} events older than ${cutoff.toISOString()}.`);
  console.log(
    `Removed ${removedBuckets} collection and ${removedLoginBuckets} login rate-limit buckets.`,
  );
}

main()
  .catch((error: unknown) => {
    console.error(error instanceof Error ? error.message : error);
    process.exitCode = 1;
  })
  .finally(() => endDatabasePools());
