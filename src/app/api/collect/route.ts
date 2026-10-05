import { eq, sql } from "drizzle-orm";
import { NextResponse } from "next/server";
import { z } from "zod";
import { db } from "@/db";
import { rateLimitBuckets, siteEvents, sites } from "@/db/schema";
import { parseAttribution } from "@/lib/attribution";
import { hashRateLimitIp, sha256 } from "@/lib/crypto";
import { originIsAllowed } from "@/lib/domains";
import { clientIp, cleanPath, cleanReferrerHost, isValidAnonymousId } from "@/lib/privacy";
import { allowsRateLimitCount, isDoNotTrack } from "@/lib/collection-policy";

export const runtime = "nodejs";

const idSchema = z.string().refine(isValidAnonymousId, "Invalid anonymous ID.");
const objectProperties = z
  .record(z.string(), z.unknown())
  .default({})
  .refine((value) => {
    try {
      return Object.keys(value).length <= 40 && JSON.stringify(value).length <= 8_192;
    } catch {
      return false;
    }
  }, "Event properties are too large.");

const legacyProperties = z.discriminatedUnion("event", [
  z.object({ event: z.literal("welcome_view"), properties: z.object({}).strict().default({}) }),
  z.object({
    event: z.literal("welcome_cta_click"),
    properties: z
      .object({
        target: z.enum(["demo", "login", "email"]),
        placement: z.enum(["header", "hero", "footer"]),
      })
      .strict(),
  }),
  z.object({
    event: z.literal("welcome_scroll_depth"),
    properties: z
      .object({
        depth: z.union([z.literal(25), z.literal(50), z.literal(75), z.literal(100)]),
      })
      .strict(),
  }),
  z.object({
    event: z.literal("welcome_section_view"),
    properties: z
      .object({
        section: z.enum([
          "hero",
          "metrics",
          "challenge_solution",
          "roadmap",
          "regulations",
          "practitioners",
          "footer_cta",
        ]),
      })
      .strict(),
  }),
  z.object({
    event: z.literal("welcome_regulation_tab"),
    properties: z
      .object({
        regulation: z.enum(["eu-ai-act", "iso-42001", "gdpr-pci", "sox"]),
      })
      .strict(),
  }),
]);

const envelopeSchema = z
  .object({
    siteKey: z.string().optional(),
    site_key: z.string().optional(),
    visitorId: idSchema.optional(),
    anonymousId: idSchema.optional(),
    anonymous_id: idSchema.optional(),
    sessionId: idSchema,
    event: z.string().min(1).max(128).optional(),
    eventName: z.string().min(1).max(128).optional(),
    name: z.string().min(1).max(128).optional(),
    path: z.string().min(1).max(4096),
    referrerHost: z.string().max(2048).optional(),
    referrer_host: z.string().max(2048).optional(),
    properties: objectProperties,
  })
  .passthrough();

type CollectInput = {
  siteKey?: string;
  visitorId: string;
  sessionId: string;
  eventName: string;
  path: string;
  referrerHost?: string;
  properties: Record<string, unknown>;
};

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

export function parseEnvelope(body: unknown): CollectInput | null {
  if (!body || typeof body !== "object" || Array.isArray(body)) return null;
  const raw = body as Record<string, unknown>;
  const legacyName = typeof raw.event === "string" ? raw.event : null;
  const shared = envelopeSchema.safeParse(body);
  if (!shared.success) return null;
  const data = shared.data;
  const visitorId = data.visitorId ?? data.anonymousId ?? data.anonymous_id;
  const eventName = data.eventName ?? data.name ?? data.event;
  if (!visitorId || !eventName) return null;

  let properties = data.properties;
  if (legacyName?.startsWith("welcome_")) {
    const parsedLegacy = legacyProperties.safeParse({
      event: legacyName,
      properties: raw.properties ?? {},
    });
    if (!parsedLegacy.success) return null;
    properties = parsedLegacy.data.properties as Record<string, unknown>;
  }
  return {
    siteKey: data.siteKey ?? data.site_key,
    visitorId,
    sessionId: data.sessionId,
    eventName,
    path: cleanPath(data.path),
    referrerHost: cleanReferrerHost(data.referrerHost ?? data.referrer_host) ?? undefined,
    properties,
  };
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
