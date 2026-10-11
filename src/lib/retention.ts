import { pool } from "@/db";

export const EVENT_PRUNE_BATCH_SIZE = 10_000;

export function retentionCutoff(now = new Date(), months = 24): Date {
  const cutoff = new Date(now);
  const day = cutoff.getUTCDate();
  cutoff.setUTCDate(1);
  cutoff.setUTCMonth(cutoff.getUTCMonth() - months);
  const lastDay = new Date(
    Date.UTC(cutoff.getUTCFullYear(), cutoff.getUTCMonth() + 1, 0),
  ).getUTCDate();
  cutoff.setUTCDate(Math.min(day, lastDay));
  return cutoff;
}

export async function pruneExpiredData(cutoff: Date, now = new Date()) {
  let removedEventCount = 0;
  while (true) {
    const removedEvents = await pool.query(
      `delete from site_events
       where id in (
         select id from site_events
         where created_at < $1
         order by created_at, id
         limit $2
       )`,
      [cutoff.toISOString(), EVENT_PRUNE_BATCH_SIZE],
    );
    const batchCount = removedEvents.rowCount ?? 0;
    removedEventCount += batchCount;
    if (batchCount < EVENT_PRUNE_BATCH_SIZE) break;
  }

  const removedBuckets = await pool.query(
    "delete from rate_limit_buckets where window_started_at < $1",
    [new Date(now.getTime() - 24 * 60 * 60 * 1000)],
  );
  const removedLoginBuckets = await pool.query(
    "delete from auth_rate_limit_buckets where window_started_at < $1",
    [new Date(now.getTime() - 24 * 60 * 60 * 1000)],
  );
  return {
    removedEvents: removedEventCount,
    removedBuckets: removedBuckets.rowCount ?? 0,
    removedLoginBuckets: removedLoginBuckets.rowCount ?? 0,
  };
}
