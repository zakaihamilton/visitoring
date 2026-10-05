import "dotenv/config";
import { pool } from "@/db";
import { pruneExpiredData, retentionCutoff } from "@/lib/retention";

async function main(): Promise<void> {
  const cutoff = retentionCutoff();
  const { removedEvents, removedSessions, removedBuckets, removedLoginBuckets } =
    await pruneExpiredData(cutoff);
  console.log(`Pruned ${removedEvents} events older than ${cutoff.toISOString()}.`);
  console.log(`Removed ${removedSessions} expired authentication sessions.`);
  console.log(
    `Removed ${removedBuckets} collection and ${removedLoginBuckets} login rate-limit buckets.`,
  );
}

main()
  .catch((error: unknown) => {
    console.error(error instanceof Error ? error.message : error);
    process.exitCode = 1;
  })
  .finally(() => pool.end());
