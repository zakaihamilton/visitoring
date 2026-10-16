import { and, count, desc, eq, gte, ilike, lte, sql } from "drizzle-orm";
import { db, pool } from "@/db";
import { siteEvents } from "@/db/schema";

const EVENT_NAME_OPTIONS_LIMIT = 100;

type AnalyticsFilters = {
  workspaceId: string;
  siteId: string;
  from: string;
  to: string;
  event?: string;
  path?: string;
  property?: string;
  propertyValue?: string;
  visitor?: string;
  session?: string;
};

type BreakdownKind = "device" | "browser" | "os" | "country" | "region";
type Breakdown = { label: string; count: number };
type BreakdownRow = { kind: BreakdownKind; label: string; count: string };
type LabelCountRow = { label: string; count: string };
type PageAndReferrerRow = { kind: "page" | "referrer"; label: string; count: string };

function likeValue(value: string): string {
  return `%${value.replace(/[\\%_]/g, "\\$&")}%`;
}

function conditions(filters: AnalyticsFilters) {
  const clauses = [
    eq(siteEvents.workspaceId, filters.workspaceId),
    eq(siteEvents.siteId, filters.siteId),
    gte(siteEvents.createdAt, filters.from),
    lte(siteEvents.createdAt, filters.to),
  ];
  if (filters.event) clauses.push(eq(siteEvents.eventName, filters.event));
  if (filters.path) clauses.push(ilike(siteEvents.path, likeValue(filters.path)));
  if (filters.visitor) clauses.push(eq(siteEvents.visitorId, filters.visitor));
  if (filters.session) clauses.push(eq(siteEvents.sessionId, filters.session));
  if (filters.property && filters.propertyValue) {
    clauses.push(
      sql`coalesce(${siteEvents.properties} ->> ${filters.property}, '') ilike ${likeValue(filters.propertyValue)}`,
    );
  }
  return and(...clauses);
}

function sqlConditions(filters: AnalyticsFilters, defaultPageViews = false) {
  const parameters: unknown[] = [];
  const value = (input: unknown) => {
    parameters.push(input);
    return `$${parameters.length}`;
  };
  const clauses = [
    `workspace_id = ${value(filters.workspaceId)}`,
    `site_id = ${value(filters.siteId)}`,
    `created_at >= ${value(filters.from)}`,
    `created_at <= ${value(filters.to)}`,
  ];
  if (filters.event) clauses.push(`event_name = ${value(filters.event)}`);
  else if (defaultPageViews) clauses.push("event_name = 'page_view'");
  if (filters.path) clauses.push(`path ILIKE ${value(likeValue(filters.path))}`);
  if (filters.visitor) clauses.push(`visitor_id = ${value(filters.visitor)}`);
  if (filters.session) clauses.push(`session_id = ${value(filters.session)}`);
  if (filters.property && filters.propertyValue) {
    clauses.push(
      `coalesce(properties ->> ${value(filters.property)}, '') ILIKE ${value(likeValue(filters.propertyValue))}`,
    );
  }
  return { clause: clauses.join(" AND "), parameters };
}

const pageAndReferrerQuery = `
  WITH page_events AS (
    SELECT path, referrer_host
    FROM site_events
    WHERE /* whereClause */
  ),
  pages AS (
    SELECT path AS label, count(*) AS count
    FROM page_events
    GROUP BY path
    ORDER BY count(*) DESC
    LIMIT 6
  ),
  referrers AS (
    SELECT coalesce(referrer_host, 'Direct') AS label, count(*) AS count
    FROM page_events
    GROUP BY referrer_host
    ORDER BY count(*) DESC
    LIMIT 6
  )
  SELECT kind, label, count
  FROM (
    SELECT 'page'::text AS kind, label, count, 1 AS sort_order FROM pages
    UNION ALL
    SELECT 'referrer'::text AS kind, label, count, 2 AS sort_order FROM referrers
  ) AS grouped
  ORDER BY sort_order, count DESC
`;

const breakdownQuery = `
  WITH filtered_events AS (
    SELECT device, browser, os, country, region
    FROM site_events
    WHERE /* whereClause */
  ),
  device_rows AS (
    SELECT coalesce(device, 'Unknown') AS label, count(*) AS count
    FROM filtered_events
    GROUP BY device
    ORDER BY count(*) DESC
    LIMIT 8
  ),
  browser_rows AS (
    SELECT coalesce(browser, 'Unknown') AS label, count(*) AS count
    FROM filtered_events
    GROUP BY browser
    ORDER BY count(*) DESC
    LIMIT 8
  ),
  os_rows AS (
    SELECT coalesce(os, 'Unknown') AS label, count(*) AS count
    FROM filtered_events
    GROUP BY os
    ORDER BY count(*) DESC
    LIMIT 8
  ),
  country_rows AS (
    SELECT coalesce(country, 'Unknown') AS label, count(*) AS count
    FROM filtered_events
    GROUP BY country
    ORDER BY count(*) DESC
    LIMIT 8
  ),
  region_rows AS (
    SELECT coalesce(region, 'Unknown') AS label, count(*) AS count
    FROM filtered_events
    GROUP BY region
    ORDER BY count(*) DESC
    LIMIT 8
  )
  SELECT kind, label, count
  FROM (
    SELECT 'device'::text AS kind, label, count, 1 AS sort_order FROM device_rows
    UNION ALL
    SELECT 'browser'::text AS kind, label, count, 2 AS sort_order FROM browser_rows
    UNION ALL
    SELECT 'os'::text AS kind, label, count, 3 AS sort_order FROM os_rows
    UNION ALL
    SELECT 'country'::text AS kind, label, count, 4 AS sort_order FROM country_rows
    UNION ALL
    SELECT 'region'::text AS kind, label, count, 5 AS sort_order FROM region_rows
  ) AS grouped
  ORDER BY sort_order, count DESC
`;

function mappedBreakdowns(rows: BreakdownRow[], kind: BreakdownKind): Breakdown[] {
  return rows
    .filter((row) => row.kind === kind)
    .map((row) => ({ label: row.label, count: Number(row.count) }));
}

function mappedLabelCounts(rows: LabelCountRow[]): Breakdown[] {
  return rows.map((row) => ({ label: row.label, count: Number(row.count) }));
}

export async function getAnalyticsData(filters: AnalyticsFilters) {
  const where = conditions(filters);
  const dayExpression = sql<string>`to_char(${siteEvents.createdAt} at time zone 'UTC', 'YYYY-MM-DD')`;
  const fromDay = new Date(filters.from);
  fromDay.setUTCHours(0, 0, 0, 0);
  const toDay = new Date(filters.to);
  toDay.setUTCHours(0, 0, 0, 0);
  const dayCount = Math.max(1, Math.floor((toDay.getTime() - fromDay.getTime()) / 86_400_000) + 1);
  const dayLimit = Math.min(dayCount, 90);
  const start = new Date(toDay);
  start.setUTCDate(start.getUTCDate() - (dayLimit - 1));
  const trendWhere = and(where, gte(siteEvents.createdAt, start.toISOString()));
  const pageQuery = sqlConditions(filters, !filters.event);
  const breakdownConditions = sqlConditions(filters);
  const [totalRows, trend, pageAndReferrerRows, breakdownRows, eventRows, eventNames] =
    await Promise.all([
      db
        .select({
          total: count(),
          visitors: sql<number>`count(distinct ${siteEvents.visitorId})::int`,
          sessions: sql<number>`count(distinct ${siteEvents.sessionId})::int`,
          pageViews: sql<number>`count(*) filter (where ${siteEvents.eventName} = 'page_view')::int`,
          customEvents: sql<number>`count(*) filter (where ${siteEvents.eventName} <> 'page_view')::int`,
        })
        .from(siteEvents)
        .where(where),
      db
        .select({
          day: dayExpression,
          total: count(),
          pageViews: sql<number>`count(*) filter (where ${siteEvents.eventName} = 'page_view')::int`,
        })
        .from(siteEvents)
        .where(trendWhere)
        .groupBy(dayExpression)
        .orderBy(dayExpression),
      pool.query<PageAndReferrerRow>(
        pageAndReferrerQuery.replace("/* whereClause */", pageQuery.clause),
        pageQuery.parameters,
      ),
      pool.query<BreakdownRow>(
        breakdownQuery.replace("/* whereClause */", breakdownConditions.clause),
        breakdownConditions.parameters,
      ),
      db
        .select({
          id: siteEvents.id,
          eventName: siteEvents.eventName,
          path: siteEvents.path,
          visitorId: siteEvents.visitorId,
          sessionId: siteEvents.sessionId,
          properties: siteEvents.properties,
          createdAt: siteEvents.createdAt,
        })
        .from(siteEvents)
        .where(where)
        .orderBy(desc(siteEvents.createdAt))
        .limit(20),
      db
        .selectDistinct({ name: siteEvents.eventName })
        .from(siteEvents)
        .where(
          and(
            eq(siteEvents.workspaceId, filters.workspaceId),
            eq(siteEvents.siteId, filters.siteId),
          ),
        )
        .orderBy(siteEvents.eventName)
        .limit(EVENT_NAME_OPTIONS_LIMIT),
    ]);
  const totals = totalRows[0];

  const trendMap = new Map(
    trend.map((item) => [item.day, { total: item.total, pageViews: item.pageViews }]),
  );
  const days = Array.from({ length: dayLimit }, (_, index) => {
    const date = new Date(start);
    date.setUTCDate(start.getUTCDate() + index);
    const day = date.toISOString().slice(0, 10);
    const result = trendMap.get(day) ?? { total: 0, pageViews: 0 };
    return { day, ...result };
  });

  const eventNameOptions = new Set(eventNames.map((row) => row.name));
  if (filters.event && filters.event.length <= 128) eventNameOptions.add(filters.event);

  return {
    total: totals?.total ?? 0,
    visitors: totals?.visitors ?? 0,
    sessions: totals?.sessions ?? 0,
    pageViews: totals?.pageViews ?? 0,
    customEvents: totals?.customEvents ?? 0,
    trend: days,
    pages: mappedLabelCounts(pageAndReferrerRows.rows.filter((row) => row.kind === "page")),
    referrers: mappedLabelCounts(pageAndReferrerRows.rows.filter((row) => row.kind === "referrer")),
    devices: mappedBreakdowns(breakdownRows.rows, "device"),
    browsers: mappedBreakdowns(breakdownRows.rows, "browser"),
    systems: mappedBreakdowns(breakdownRows.rows, "os"),
    countries: mappedBreakdowns(breakdownRows.rows, "country"),
    regions: mappedBreakdowns(breakdownRows.rows, "region"),
    events: eventRows,
    eventNames: [...eventNameOptions].sort((left, right) => left.localeCompare(right)),
  };
}
