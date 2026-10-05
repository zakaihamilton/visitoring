import { eq, sql } from "drizzle-orm";
import { NextResponse } from "next/server";
import { db } from "@/db";
import { rateLimitBuckets, siteEvents, sites } from "@/db/schema";
import { parseAttribution } from "@/lib/attribution";
import { parseEnvelope } from "@/lib/collect-envelope";
import { hashRateLimitIp, sha256 } from "@/lib/crypto";
import { originIsAllowed } from "@/lib/domains";
import { clientIp } from "@/lib/privacy";
import { allowsRateLimitCount, isDoNotTrack } from "@/lib/collection-policy";

export const runtime = "nodejs";

const MAX_REQUEST_BYTES = 16_384;

async function readLimitedBody(request: Request): Promise<string | null> {
  const contentLength = request.headers.get("content-length");
  if (contentLength && /^\d+$/.test(contentLength) && Number(contentLength) > MAX_REQUEST_BYTES) {
    await request.body?.cancel().catch(() => undefined);
    return null;
  }

  const reader = request.body?.getReader();
  if (!reader) return "";

  const chunks: Uint8Array[] = [];
  let totalBytes = 0;
  try {
    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      totalBytes += value.byteLength;
      if (totalBytes > MAX_REQUEST_BYTES) {
        await reader.cancel().catch(() => undefined);
        return null;
      }
      chunks.push(value);
    }
  } finally {
    reader.releaseLock();
  }

  const bytes = new Uint8Array(totalBytes);
  let offset = 0;
  for (const chunk of chunks) {
    bytes.set(chunk, offset);
    offset += chunk.byteLength;
  }
  return new TextDecoder().decode(bytes);
}

function corsHeaders(origin: string): HeadersInit {
  return {
    "Access-Control-Allow-Origin": origin,
    "Access-Control-Allow-Methods": "POST, OPTIONS",
    "Access-Control-Allow-Headers": "Content-Type",
    "Access-Control-Max-Age": "600",
    Vary: "Origin",
  };
}

async function authorizedSite(siteKey: string | null, origin: string | null) {
  if (!siteKey?.startsWith("vk_")) return null;
  const [site] = await db
    .select()
    .from(sites)
    .where(eq(sites.siteKeyHash, sha256(siteKey)))
    .limit(1);
  if (!site || !originIsAllowed(origin, site.allowedDomains)) return null;
  return site;
}

export async function OPTIONS(request: Request): Promise<Response> {
  const url = new URL(request.url);
  const origin = request.headers.get("origin");
  const site = await authorizedSite(url.searchParams.get("key"), origin);
  if (!site || !origin) return new Response(null, { status: 403 });
  return new Response(null, { status: 204, headers: corsHeaders(origin) });
}

export async function POST(request: Request): Promise<Response> {
  const url = new URL(request.url);
  const origin = request.headers.get("origin");
  let body: unknown;
  try {
    const rawBody = await readLimitedBody(request);
    if (rawBody === null)
      return NextResponse.json({ error: "Event is too large." }, { status: 413 });
    body = JSON.parse(rawBody);
  } catch {
    return NextResponse.json({ error: "Invalid event payload." }, { status: 400 });
  }
  const event = parseEnvelope(body);
  if (!event) return NextResponse.json({ error: "Invalid event payload." }, { status: 400 });
  const siteKey = url.searchParams.get("key") ?? event.siteKey;
  const site = await authorizedSite(siteKey ?? null, origin);
  if (!site || !origin)
    return NextResponse.json({ error: "Site key or origin not allowed." }, { status: 403 });
  const cors = corsHeaders(origin);

  if (isDoNotTrack(request.headers.get("dnt")))
    return new Response(null, { status: 204, headers: cors });
  const ip = clientIp(request);
  const now = new Date();
  const windowMs = 15 * 60 * 1000;
  const [bucket] = await db
    .insert(rateLimitBuckets)
    .values({
      siteId: site.id,
      ipHash: hashRateLimitIp(ip),
      windowStartedAt: now,
      count: 1,
    })
    .onConflictDoUpdate({
      target: [rateLimitBuckets.siteId, rateLimitBuckets.ipHash],
      set: {
        windowStartedAt: sql`case when ${rateLimitBuckets.windowStartedAt} <= ${new Date(now.getTime() - windowMs)} then ${now} else ${rateLimitBuckets.windowStartedAt} end`,
        count: sql`case when ${rateLimitBuckets.windowStartedAt} <= ${new Date(now.getTime() - windowMs)} then 1 else ${rateLimitBuckets.count} + 1 end`,
      },
    })
    .returning({ count: rateLimitBuckets.count });
  if (bucket && !allowsRateLimitCount(bucket.count))
    return NextResponse.json({ error: "Rate limit exceeded." }, { status: 429, headers: cors });

  const attribution = await parseAttribution(ip, request.headers.get("user-agent"));
  await db.insert(siteEvents).values({
    workspaceId: site.workspaceId,
    siteId: site.id,
    visitorId: event.visitorId,
    sessionId: event.sessionId,
    eventName: event.eventName,
    path: event.path,
    referrerHost: event.referrerHost,
    properties: event.properties,
    ...attribution,
  });
  return new Response(null, { status: 204, headers: cors });
}
