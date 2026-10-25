import { afterAll, beforeAll, describe, expect, it, vi } from "vitest";
import { and, eq } from "drizzle-orm";
import { db, pool } from "@/db";
import { siteEvents, sites, workspaces } from "@/db/schema";
import { createSiteKey, sha256 } from "@/lib/crypto";
import { getAnalyticsData, getRecentEventsData } from "@/lib/analytics";
import { POST } from "@/app/api/collect/route";
import { pruneExpiredData, retentionCutoff } from "@/lib/retention";

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
        organizationId: "660601f6-c1c3-42b0-9118-c2285d7659a3",
      })
      .returning();
    const [other] = await db
      .insert(workspaces)
      .values({
        name: "Other workspace",
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

    const querySpy = vi.spyOn(pool, "query");
    try {
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
      expect(querySpy).toHaveBeenCalledTimes(7);
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
    } finally {
      querySpy.mockRestore();
    }

    const customData = await getAnalyticsData({
      workspaceId,
      siteId,
      from: new Date(Date.now() - 86_400_000).toISOString(),
      to: new Date(Date.now() + 86_400_000).toISOString(),
      event: "signup",
    });
    expect(customData).toMatchObject({ total: 1, pageViews: 0, customEvents: 1 });
  });

  it("applies dashboard date, event, path, property, visitor, and session filters", async () => {
    const rangeStart = Date.now() + 100 * 86_400_000;
    const inRangeAt = (offsetMs: number) => new Date(rangeStart - offsetMs).toISOString();
    await db.insert(siteEvents).values([
      {
        workspaceId,
        siteId,
        visitorId: "filter-visitor",
        sessionId: "filter-session",
        eventName: "filter_action",
        path: "/filter-target",
        properties: { cohort: "alpha" },
        createdAt: inRangeAt(60_000),
      },
      {
        workspaceId,
        siteId,
        visitorId: "filter-visitor",
        sessionId: "other-session",
        eventName: "filter_action",
        path: "/filter-target",
        properties: { cohort: "alpha" },
        createdAt: inRangeAt(50_000),
      },
      {
        workspaceId,
        siteId,
        visitorId: "other-visitor",
        sessionId: "filter-session",
        eventName: "filter_action",
        path: "/filter-target",
        properties: { cohort: "alpha" },
        createdAt: inRangeAt(40_000),
      },
      {
        workspaceId,
        siteId,
        visitorId: "filter-visitor",
        sessionId: "filter-session",
        eventName: "filter_action",
        path: "/other-path",
        properties: { cohort: "alpha" },
        createdAt: inRangeAt(30_000),
      },
      {
        workspaceId,
        siteId,
        visitorId: "filter-visitor",
        sessionId: "filter-session",
        eventName: "filter_action",
        path: "/filter-target",
        properties: { cohort: "beta" },
        createdAt: inRangeAt(20_000),
      },
      {
        workspaceId,
        siteId,
        visitorId: "filter-visitor",
        sessionId: "filter-session",
        eventName: "other_action",
        path: "/filter-target",
        properties: { cohort: "alpha" },
        createdAt: inRangeAt(10_000),
      },
      {
        workspaceId,
        siteId,
        visitorId: "filter-visitor",
        sessionId: "filter-session",
        eventName: "filter_action",
        path: "/filter-target",
        properties: { cohort: "alpha" },
        createdAt: new Date(rangeStart - 86_400_000).toISOString(),
      },
    ]);

    const from = new Date(rangeStart - 60 * 60_000).toISOString();
    const to = new Date(rangeStart + 60 * 60_000).toISOString();
    const base = { workspaceId, siteId, from, to };
    const dated = await getAnalyticsData(base);
    expect(dated.total).toBe(6);
    for (const filter of [
      { event: "filter_action" },
      { path: "/filter-target" },
      { property: "cohort", propertyValue: "alpha" },
      { visitor: "filter-visitor" },
      { session: "filter-session" },
    ]) {
      const filtered = await getAnalyticsData({ ...base, ...filter });
      expect(filtered.total).toBe(5);
    }
  });

  it("compares scoped, filtered traffic with distinct buckets and full breakdown denominators", async () => {
    const sample = {
      workspaceId,
      siteId,
      eventName: "page_view",
      visitorId: "traffic-visitor",
      sessionId: "traffic-session",
      properties: { cohort: "traffic" },
    };
    await db.insert(siteEvents).values([
      ...Array.from({ length: 8 }, (_, index) => ({
        ...sample,
        path: `/traffic/${index}`,
        createdAt: `2025-02-02T${index < 4 ? "10" : "11"}:00:00.000Z`,
      })),
      ...Array.from({ length: 3 }, (_, index) => ({
        ...sample,
        path: `/traffic/${index}`,
        createdAt: "2025-02-01T10:00:00.000Z",
      })),
      {
        ...sample,
        path: "/traffic/excluded",
        properties: { cohort: "other" },
        createdAt: "2025-02-01T10:00:00.000Z",
      },
      {
        ...sample,
        workspaceId: otherWorkspaceId,
        path: "/traffic/other-workspace",
        createdAt: "2025-02-01T10:00:00.000Z",
      },
      {
        ...sample,
        path: "/traffic/excluded",
        eventName: "signup",
        createdAt: "2025-02-02T10:00:00.000Z",
      },
      {
        ...sample,
        path: "/traffic/excluded",
        visitorId: "other-visitor",
        createdAt: "2025-02-01T10:00:00.000Z",
      },
      {
        ...sample,
        path: "/traffic/excluded",
        sessionId: "other-session",
        createdAt: "2025-02-01T10:00:00.000Z",
      },
      { ...sample, path: "/elsewhere", createdAt: "2025-02-01T10:00:00.000Z" },
    ]);
    const filters = {
      workspaceId,
      siteId,
      from: "2025-02-02T00:00:00.000Z",
      to: "2025-02-02T23:59:59.999Z",
      event: "page_view",
      path: "/traffic/",
      property: "cohort",
      propertyValue: "traffic",
      visitor: "traffic-visitor",
      session: "traffic-session",
    };
    const data = await getAnalyticsData(filters);
    expect(data).toMatchObject({
      total: 8,
      visitors: 1,
      sessions: 1,
      breakdownTotal: 8,
      hasSiteActivity: true,
      previous: { total: 3, visitors: 1, sessions: 1 },
    });
    expect(data.pages).toHaveLength(6);
    expect(data.pages.reduce((sum, page) => sum + page.count, 0)).toBe(6);
    expect(data.trend).toHaveLength(24);
    expect(data.trend[0]?.current.total).toBe(0);
    expect(data.trend[10]?.current).toMatchObject({ total: 4, visitors: 1, sessions: 1 });
    expect(data.trend[11]?.current.visitors).toBe(1);
    expect(data.trend[10]?.previous.total).toBe(3);
    const empty = await getAnalyticsData({ ...filters, event: "no_such_event" });
    expect(empty).toMatchObject({ total: 0, hasSiteActivity: true });
    const isolated = await getAnalyticsData({
      ...filters,
      workspaceId: otherWorkspaceId,
      path: "/traffic/0",
    });
    expect(isolated).toMatchObject({ total: 0, previous: { total: 0 } });
  });

  it("loads only the latest 20 scoped matching event records on the events page", async () => {
    await db.insert(siteEvents).values(
      Array.from({ length: 25 }, (_, index) => ({
        workspaceId,
        siteId,
        visitorId: "detail-visitor",
        sessionId: "detail-session",
        eventName: "detail_test",
        path: "/details",
        properties: { plan: "starter" },
        createdAt: new Date(Date.UTC(2025, 2, 1, 10, 0, index)).toISOString(),
      })),
    );
    const filters = {
      workspaceId,
      siteId,
      from: "2025-03-01T00:00:00.000Z",
      to: "2025-03-01T23:59:59.999Z",
      event: "detail_test",
      path: "/details",
      visitor: "detail-visitor",
      session: "detail-session",
      property: "plan",
      propertyValue: "starter",
    };
    const data = await getRecentEventsData(filters);
    expect(data.total).toBe(25);
    expect(data.events).toHaveLength(20);
    expect(new Date(data.events[0]?.createdAt ?? "").toISOString()).toBe(
      "2025-03-01T10:00:24.000Z",
    );
    expect(new Date(data.events.at(-1)?.createdAt ?? "").toISOString()).toBe(
      "2025-03-01T10:00:05.000Z",
    );
    const older = await getRecentEventsData(filters, 2);
    expect(older).toMatchObject({ page: 2, pages: 2, pageSize: 20, total: 25 });
    expect(older.events).toHaveLength(5);
    expect(older.events.some((event) => data.events.some((recent) => recent.id === event.id))).toBe(
      false,
    );
    expect((await getRecentEventsData(filters, 999)).page).toBe(2);
    expect((await getRecentEventsData(filters, Number.NaN)).page).toBe(1);
    const isolated = await getRecentEventsData({ ...filters, workspaceId: otherWorkspaceId }, 2);
    expect(isolated).toMatchObject({ total: 0, events: [] });
    const filtered = await getRecentEventsData({ ...filters, propertyValue: "enterprise" });
    expect(filtered).toMatchObject({ total: 0, events: [] });
  });

  it("freezes event pagination while new events arrive and refreshes to the latest population", async () => {
    vi.useFakeTimers({ toFake: ["Date"] });
    try {
      vi.setSystemTime(new Date("2026-10-23T12:00:00.000Z"));
      const base = {
        workspaceId,
        siteId,
        visitorId: "pagination-visitor",
        sessionId: "pagination-session",
        eventName: "pagination_test",
        path: "/pagination",
      };
      await db.insert(siteEvents).values(
        Array.from({ length: 21 }, (_, index) => ({
          ...base,
          createdAt: new Date(Date.now() - 10_000 - index * 100).toISOString(),
        })),
      );
      const filters = {
        workspaceId,
        siteId,
        from: "2026-10-23T00:00:00.000Z",
        to: "2026-10-23T23:59:59.999Z",
        event: "pagination_test",
      };
      const first = await getRecentEventsData(filters);
      expect(first.snapshotAt).toBe("2026-10-23T12:00:00.000Z");
      const [newEvent] = await db
        .insert(siteEvents)
        .values({ ...base, createdAt: "2026-10-23T12:01:00.000Z" })
        .returning();
      vi.setSystemTime(new Date("2026-10-23T12:02:00.000Z"));
      const older = await getRecentEventsData(filters, 2, first.snapshotAt);
      expect(older.total).toBe(21);
      expect(older.events).toHaveLength(1);
      expect(
        older.events.some((event) => first.events.some((recent) => event.id === recent.id)),
      ).toBe(false);
      const newer = await getRecentEventsData(filters, 1, older.snapshotAt);
      expect(newer.events.map((event) => event.id)).toEqual(first.events.map((event) => event.id));
      const refreshed = await getRecentEventsData(filters);
      expect(refreshed.total).toBe(22);
      expect(refreshed.events[0]?.id).toBe(newEvent?.id);
      for (const invalid of [
        "garbage",
        "2026-02-30T00:00:00.000Z",
        "2026-10-23T13:00:00.000Z",
        "2026-10-22T12:00:00.000Z",
      ]) {
        expect((await getRecentEventsData(filters, 1, invalid)).snapshotAt).toBe(
          refreshed.snapshotAt,
        );
      }
      const isolated = await getRecentEventsData(
        { ...filters, workspaceId: otherWorkspaceId },
        2,
        first.snapshotAt,
      );
      expect(isolated).toMatchObject({ total: 0, events: [] });
    } finally {
      vi.useRealTimers();
    }
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

  it("pauses collection while a project is archived and resumes it after restoration", async () => {
    const before = await db.select().from(siteEvents).where(eq(siteEvents.siteId, siteId));
    await db
      .update(workspaces)
      .set({ archivedAt: new Date() })
      .where(eq(workspaces.id, workspaceId));

    const rejected = await collect(
      { ...payload, visitorId: "archived-project-visitor" },
      { ip: "198.51.100.56" },
    );
    expect(rejected.status).toBe(403);
    const whileArchived = await db.select().from(siteEvents).where(eq(siteEvents.siteId, siteId));
    expect(whileArchived).toHaveLength(before.length);

    await db.update(workspaces).set({ archivedAt: null }).where(eq(workspaces.id, workspaceId));
    const restored = await collect(
      { ...payload, visitorId: "restored-project-visitor" },
      { ip: "198.51.100.57" },
    );
    expect(restored.status).toBe(204);
    const afterRestore = await db
      .select()
      .from(siteEvents)
      .where(eq(siteEvents.visitorId, "restored-project-visitor"));
    expect(afterRestore).toHaveLength(1);
  });

  it("honors the DNT header and applies the 120-event site/IP rate limit", async () => {
    const configuredLimit = process.env.COLLECTOR_RATE_LIMIT_MAX_EVENTS;
    try {
      delete process.env.COLLECTOR_RATE_LIMIT_MAX_EVENTS;
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
      expect((await collect(payload, { ip: "198.51.100.41" })).status).toBe(429);

      process.env.COLLECTOR_RATE_LIMIT_MAX_EVENTS = "2";
      expect(
        (await collect({ ...payload, visitorId: "configured-limit-one" }, { ip: "198.51.100.42" }))
          .status,
      ).toBe(204);
      expect(
        (await collect({ ...payload, visitorId: "configured-limit-two" }, { ip: "198.51.100.42" }))
          .status,
      ).toBe(204);
      expect((await collect(payload, { ip: "198.51.100.42" })).status).toBe(429);
    } finally {
      if (configuredLimit === undefined) delete process.env.COLLECTOR_RATE_LIMIT_MAX_EVENTS;
      else process.env.COLLECTOR_RATE_LIMIT_MAX_EVENTS = configuredLimit;
    }
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

    const [otherSite] = await db
      .insert(sites)
      .values({
        workspaceId,
        name: "Other integration site",
        allowedDomains: ["other-analytics-test.example"],
        siteKeyHash: sha256(createSiteKey()),
        siteKeyPrefix: "vk_other_site",
      })
      .returning();
    if (!otherSite) throw new Error("Could not create the other integration site.");
    const isolatedAt = new Date(Date.now() + 100 * 86_400_000).toISOString();
    await db.insert(siteEvents).values({
      workspaceId,
      siteId: otherSite.id,
      visitorId: "other-site-visitor",
      sessionId: "other-site-session",
      eventName: "page_view",
      path: "/other-site",
      properties: {},
      createdAt: isolatedAt,
    });
    const siteScoped = await getAnalyticsData({
      workspaceId,
      siteId,
      from: isolatedAt,
      to: isolatedAt,
    });
    expect(siteScoped.total).toBe(0);
  });

  it("prunes more than one batch of expired events while retaining newer events", async () => {
    const oldCutoff = retentionCutoff(new Date(), 25);
    await pool.query(
      `insert into site_events
         (workspace_id, site_id, visitor_id, session_id, event_name, path, properties, created_at)
       select $1, $2, 'retention-batch-visitor', 'retention-batch-session', 'page_view',
              '/expired-retention-batch', '{}'::jsonb, $3
       from generate_series(1, 10001)`,
      [workspaceId, siteId, oldCutoff.toISOString()],
    );
    await db.insert(siteEvents).values({
      workspaceId,
      siteId,
      visitorId: "retention-recent-visitor",
      sessionId: "retention-recent-session",
      eventName: "page_view",
      path: "/current-retention-batch",
      properties: {},
      createdAt: new Date().toISOString(),
    });

    const result = await pruneExpiredData(retentionCutoff());
    expect(result.removedEvents).toBeGreaterThanOrEqual(10001);
    const oldRows = await db
      .select()
      .from(siteEvents)
      .where(eq(siteEvents.path, "/expired-retention-batch"));
    expect(oldRows).toHaveLength(0);
    const recentRows = await db
      .select()
      .from(siteEvents)
      .where(eq(siteEvents.path, "/current-retention-batch"));
    expect(recentRows).toHaveLength(1);
  });
});
