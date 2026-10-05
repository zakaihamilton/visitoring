import { eq, sql } from "drizzle-orm";
import { db } from "@/db";
import { authRateLimitBuckets } from "@/db/schema";
import { hashRateLimitKey } from "@/lib/crypto";

const WINDOW_MS = 15 * 60 * 1000;
const ACCOUNT_ATTEMPT_LIMIT = 10;
const IP_ATTEMPT_LIMIT = 60;

async function countAttempt(bucketKey: string, maxAttempts: number, now: Date): Promise<number> {
  const resetBefore = new Date(now.getTime() - WINDOW_MS);
  const [bucket] = await db
    .insert(authRateLimitBuckets)
    .values({ bucketKey, windowStartedAt: now, count: 1 })
    .onConflictDoUpdate({
      target: authRateLimitBuckets.bucketKey,
      set: {
        windowStartedAt: sql`case when ${authRateLimitBuckets.windowStartedAt} <= ${resetBefore} then ${now} else ${authRateLimitBuckets.windowStartedAt} end`,
        count: sql`case when ${authRateLimitBuckets.windowStartedAt} <= ${resetBefore} then 1 else least(${authRateLimitBuckets.count} + 1, ${maxAttempts + 1}) end`,
      },
    })
    .returning({ count: authRateLimitBuckets.count });
  return bucket?.count ?? maxAttempts + 1;
}

export async function isLoginRateLimited(input: {
  email: string;
  workspaceSlug: string;
  ip: string;
}): Promise<boolean> {
  const now = new Date();
  if (input.ip !== "unknown") {
    const ipCount = await countAttempt(
      hashRateLimitKey(`login:ip:${input.ip}`),
      IP_ATTEMPT_LIMIT,
      now,
    );
    if (ipCount > IP_ATTEMPT_LIMIT) return true;
  }

  const accountCount = await countAttempt(accountBucketKey(input), ACCOUNT_ATTEMPT_LIMIT, now);
  return accountCount > ACCOUNT_ATTEMPT_LIMIT;
}

function accountBucketKey(input: { email: string; workspaceSlug: string }): string {
  return hashRateLimitKey(`login:account:${input.workspaceSlug}:${input.email}`);
}

export async function clearLoginAccountAttempts(input: {
  email: string;
  workspaceSlug: string;
}): Promise<void> {
  await db
    .delete(authRateLimitBuckets)
    .where(eq(authRateLimitBuckets.bucketKey, accountBucketKey(input)));
}
