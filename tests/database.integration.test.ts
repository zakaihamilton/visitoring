import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { and, eq } from "drizzle-orm";
import { db, pool } from "@/db";
import { siteEvents, sites, workspaces } from "@/db/schema";
import { createSiteKey, sha256 } from "@/lib/crypto";
import { getAnalyticsData } from "@/lib/analytics";
import { POST } from "@/app/api/collect/route";
import { pruneExpiredData, retentionCutoff } from "@/lib/retention";
import { toImportedEvent } from "../scripts/import-utils";

const integration = Boolean(process.env.DATABASE_URL);
const suite = integration ? describe : describe.skip;
let workspaceId = "";
let otherWorkspaceId = "";
let siteId = "";
let siteKey = "";

function collect(body: unknown, options: { origin?: string; ip?: string; dnt?: string } = {}) {
  const origin = options.origin ?? "https://analytics-test.example";
  const headers = new Headers({ "content-type": "text/plain;charset=UTF-8", origin });
  if (options.ip) headers.set("x-real-ip", options.ip);
  if (options.dnt) headers.set("dnt", options.dnt);
  return POST(
    new Request(`http://localhost/api/collect?key=${encodeURIComponent(siteKey)}`, {
      method: "POST",
      headers,
      body: JSON.stringify(body),
    }),
  );
}

const payload = {
  visitorId: "integration-visitor",
  sessionId: "integration-session",
  eventName: "page_view",
  path: "/pricing?secret=not-stored",
  referrerHost: "https://search.example/results?private=not-stored",
  properties: { tier: "free" },
};

suite("PostgreSQL collector integration", () => {
  beforeAll(async () => {
    const [workspace] = await db
      .insert(workspaces)
      .values({
        name: "Integration workspace",
        slug: `it-${crypto.randomUUID().slice(0, 8)}`,
        organizationId: "660601f6-c1c3-42b0-9118-c2285d7659a3",
      })
      .returning();
    const [other] = await db
      .insert(workspaces)
      .values({
        name: "Other workspace",
        slug: `it-${crypto.randomUUID().slice(0, 8)}`,
        organizationId: "660601f6-c1c3-42b0-9118-c2285d7659a3",
      })
      .returning();
    if (!workspace || !other) throw new Error("Could not create integration workspaces.");
    workspaceId = workspace.id;
    otherWorkspaceId = other.id;
    siteKey = createSiteKey();
    const [site] = await db
      .insert(sites)
      .values({
        workspaceId,
        name: "Integration site",
        allowedDomains: ["analytics-test.example"],
        siteKeyHash: sha256(siteKey),
        siteKeyPrefix: siteKey.slice(0, 11),
      })
      .returning();
    if (!site) throw new Error("Could not create integration site.");
    siteId = site.id;
  });

  afterAll(async () => {
    if (workspaceId) await db.delete(workspaces).where(eq(workspaces.id, workspaceId));
    if (otherWorkspaceId) await db.delete(workspaces).where(eq(workspaces.id, otherWorkspaceId));
    await pool.end();
  });

  it("accepts approved origins and stores sanitized fields with coarse attribution only", async () => {
    const response = await collect(payload, { ip: "198.51.100.31" });
    expect(response.status).toBe(204);
    expect(response.headers.get("access-control-allow-origin")).toBe(
      "https://analytics-test.example",
    );
    const [stored] = await db
      .select()
      .from(siteEvents)
      .where(and(eq(siteEvents.siteId, siteId), eq(siteEvents.visitorId, "integration-visitor")))
      .limit(1);
    expect(stored).toMatchObject({
      path: "/pricing",
      referrerHost: "search.example",
      eventName: "page_view",
      properties: { tier: "free" },
    });
    expect(stored?.browser).toBeNull();
    expect(stored?.country).toBeNull();
    expect(stored?.region).toBeNull();
  });

  it("reports filterable page-view counts, breakdowns, and generic custom events", async () => {
    const custom = await collect(
      {
        visitorId: "custom-event-visitor",
        sessionId: "custom-event-session",
        eventName: "signup",
        path: "/pricing",
        properties: { plan: "starter" },
      },
      { ip: "198.51.100.35" },
    );
    expect(custom.status).toBe(204);

    const data = await getAnalyticsData({
      workspaceId,
      siteId,
      from: new Date(Date.now() - 86_400_000).toISOString(),
      to: new Date(Date.now() + 86_400_000).toISOString(),
      event: "page_view",
      path: "/pricing",
      property: "tier",
      propertyValue: "free",
      visitor: "integration-visitor",
      session: "integration-session",
    });
    expect(data).toMatchObject({
      total: 1,
      pageViews: 1,
      visitors: 1,
      sessions: 1,
      customEvents: 0,
    });
    expect(data.devices[0]).toMatchObject({ label: "Unknown", count: 1 });
    expect(data.countries[0]).toMatchObject({ label: "Unknown", count: 1 });
    expect(data.pages[0]).toMatchObject({ label: "/pricing", count: 1 });
    expect(data.referrers[0]).toMatchObject({ label: "search.example", count: 1 });

    const customData = await getAnalyticsData({
      workspaceId,
      siteId,
      from: new Date(Date.now() - 86_400_000).toISOString(),
      to: new Date(Date.now() + 86_400_000).toISOString(),
      event: "signup",
    });
    expect(customData).toMatchObject({ total: 1, pageViews: 0, customEvents: 1 });
  });

  it("imports welcome_view as a page view metric and deduplicates stable source IDs", async () => {
    const imported = toImportedEvent(
      {
        id: "legacy-event-id",
        anonymous_id: "legacy-visitor-123",
        session_id: "legacy-session-123",
        event_name: "welcome_view",
        path: "/?utm_source=legacy",
        referrer_host: "legacy.example",
        properties: {},
        created_at: new Date().toISOString(),
      },
      { id: siteId, workspaceId },
    );
    const first = await db
      .insert(siteEvents)
      .values(imported)
      .onConflictDoNothing({
        target: [siteEvents.siteId, siteEvents.sourceId],
      })
      .returning({ id: siteEvents.id });
    const second = await db
      .insert(siteEvents)
      .values(imported)
      .onConflictDoNothing({
        target: [siteEvents.siteId, siteEvents.sourceId],
      })
      .returning({ id: siteEvents.id });
    expect(first).toHaveLength(1);
    expect(second).toHaveLength(0);
    const data = await getAnalyticsData({
      workspaceId,
      siteId,
      from: new Date(Date.now() - 86_400_000).toISOString(),
      to: new Date(Date.now() + 86_400_000).toISOString(),
      event: "welcome_view",
    });
    expect(data).toMatchObject({ total: 1, pageViews: 1 });
  });

  it("rejects unapproved origins and invalid payloads without inserting events", async () => {
    const before = await db.select().from(siteEvents).where(eq(siteEvents.siteId, siteId));
    expect(
      (await collect(payload, { origin: "https://other.example", ip: "198.51.100.32" })).status,
    ).toBe(403);
    expect((await collect({ ...payload, visitorId: "x" }, { ip: "198.51.100.33" })).status).toBe(
      400,
    );
    const after = await db.select().from(siteEvents).where(eq(siteEvents.siteId, siteId));
    expect(after.length).toBe(before.length);
  });

  it("honors the DNT header and applies the 120-event site/IP rate limit", async () => {
    const before = await db.select().from(siteEvents).where(eq(siteEvents.siteId, siteId));
    expect((await collect(payload, { ip: "198.51.100.40", dnt: "1" })).status).toBe(204);
    const afterDnt = await db.select().from(siteEvents).where(eq(siteEvents.siteId, siteId));
    expect(afterDnt.length).toBe(before.length);
    for (let index = 0; index < 120; index += 1) {
      const response = await collect(
        { ...payload, visitorId: `rate-visitor-${index}` },
        { ip: "198.51.100.41" },
      );
      expect(response.status).toBe(204);
    }
    expect((await collect(payload, { ip: "198.51.100.41" })).status).toBe(429);
  });

  it("scopes dashboard queries to the selected workspace and site", async () => {
    const data = await getAnalyticsData({
      workspaceId: otherWorkspaceId,
      siteId,
      from: new Date(Date.now() - 86_400_000).toISOString(),
      to: new Date(Date.now() + 86_400_000).toISOString(),
    });
    expect(data.total).toBe(0);
    expect(data.pageViews).toBe(0);
  });

  it("prunes events outside the retention window", async () => {
    const oldCutoff = retentionCutoff(new Date(), 25);
    await db.insert(siteEvents).values({
      workspaceId,
      siteId,
      visitorId: "retention-visitor",
      sessionId: "retention-session",
      eventName: "page_view",
      path: "/old",
      properties: {},
      createdAt: oldCutoff.toISOString(),
    });
    const result = await pruneExpiredData(retentionCutoff());
    expect(result.removedEvents).toBeGreaterThanOrEqual(1);
    const oldRows = await db.select().from(siteEvents).where(eq(siteEvents.path, "/old"));
    expect(oldRows).toHaveLength(0);
  });
});
