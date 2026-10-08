import { pool } from "@/db";

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
  const removedEvents = await pool.query("delete from site_events where created_at < $1", [
    cutoff.toISOString(),
  ]);
  const removedSessions = await pool.query("delete from auth_sessions where expires_at <= $1", [
    now,
  ]);
  const removedBuckets = await pool.query(
    "delete from rate_limit_buckets where window_started_at < $1",
    [new Date(now.getTime() - 24 * 60 * 60 * 1000)],
  );
  const removedLoginBuckets = await pool.query(
    "delete from auth_rate_limit_buckets where window_started_at < $1",
    [new Date(now.getTime() - 24 * 60 * 60 * 1000)],
  );
  return {
    removedEvents: removedEvents.rowCount ?? 0,
    removedSessions: removedSessions.rowCount ?? 0,
    removedBuckets: removedBuckets.rowCount ?? 0,
    removedLoginBuckets: removedLoginBuckets.rowCount ?? 0,
  };
}
