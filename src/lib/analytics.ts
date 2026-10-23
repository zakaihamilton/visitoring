import { and, count, desc, eq, gte, ilike, lt, sql } from "drizzle-orm";
import { db, pool } from "@/db";
import { siteEvents } from "@/db/schema";
import { analyticsPeriod, emptyMetrics, type Metrics } from "./analytics-period";

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
    lt(siteEvents.createdAt, filters.to),
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
    `created_at < ${value(filters.to)}`,
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
    GROUP BY coalesce(referrer_host, 'Direct')
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
    GROUP BY coalesce(device, 'Unknown')
    ORDER BY count(*) DESC
    LIMIT 8
  ),
  browser_rows AS (
    SELECT coalesce(browser, 'Unknown') AS label, count(*) AS count
    FROM filtered_events
    GROUP BY coalesce(browser, 'Unknown')
    ORDER BY count(*) DESC
    LIMIT 8
  ),
  os_rows AS (
    SELECT coalesce(os, 'Unknown') AS label, count(*) AS count
    FROM filtered_events
    GROUP BY coalesce(os, 'Unknown')
    ORDER BY count(*) DESC
    LIMIT 8
  ),
  country_rows AS (
    SELECT coalesce(country, 'Unknown') AS label, count(*) AS count
    FROM filtered_events
    GROUP BY coalesce(country, 'Unknown')
    ORDER BY count(*) DESC
    LIMIT 8
  ),
  region_rows AS (
    SELECT coalesce(region, 'Unknown') AS label, count(*) AS count
    FROM filtered_events
    GROUP BY coalesce(region, 'Unknown')
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
  const period = analyticsPeriod(filters.from, filters.to);
  filters = { ...filters, from: period.from, to: period.to };
  const previousFilters = { ...filters, from: period.previousFrom, to: period.previousTo };
  const metrics = {
    total: count(),
    visitors: sql<number>`count(distinct ${siteEvents.visitorId})::int`,
    sessions: sql<number>`count(distinct ${siteEvents.sessionId})::int`,
    pageViews: sql<number>`count(*) filter (where ${siteEvents.eventName} = 'page_view')::int`,
    customEvents: sql<number>`count(*) filter (where ${siteEvents.eventName} <> 'page_view')::int`,
  };
  const bucketConditions = sqlConditions({ ...filters, from: period.previousFrom });
  const bucketParameters = [...bucketConditions.parameters, JSON.stringify(period.buckets)];
  const bucketQuery = `
    WITH buckets AS (
      SELECT (ordinality - 1)::int AS index, item->>'from' AS current_from,
        item->>'to' AS current_to, item->>'previousFrom' AS previous_from,
        item->>'previousTo' AS previous_to
      FROM jsonb_array_elements($${bucketParameters.length}::jsonb) WITH ORDINALITY AS b(item, ordinality)
    ), filtered AS (SELECT * FROM site_events WHERE ${bucketConditions.clause}),
    ranges AS (
      SELECT index, 'current' AS period, current_from::timestamptz AS start, current_to::timestamptz AS finish FROM buckets
      UNION ALL
      SELECT index, 'previous', previous_from::timestamptz, previous_to::timestamptz FROM buckets
    )
    SELECT r.index, r.period, count(e.id)::int AS total,
      count(distinct visitor_id)::int AS visitors, count(distinct session_id)::int AS sessions,
      count(e.id) filter (where event_name = 'page_view')::int AS "pageViews",
      count(e.id) filter (where event_name <> 'page_view')::int AS "customEvents"
    FROM ranges r LEFT JOIN filtered e ON e.created_at >= r.start AND e.created_at < r.finish
    GROUP BY r.index, r.period
  `;
  const pageQuery = sqlConditions(filters, !filters.event);
  const breakdownConditions = sqlConditions(filters);
  const [
    totalRows,
    previousRows,
    trend,
    activityRows,
    pageAndReferrerRows,
    breakdownRows,
    eventNames,
  ] = await Promise.all([
    db.select(metrics).from(siteEvents).where(conditions(filters)),
    db.select(metrics).from(siteEvents).where(conditions(previousFilters)),
    pool.query<Metrics & { index: number; period: "current" | "previous" }>(
      bucketQuery,
      bucketParameters,
    ),
    db
      .select({ id: siteEvents.id })
      .from(siteEvents)
      .where(
        and(eq(siteEvents.workspaceId, filters.workspaceId), eq(siteEvents.siteId, filters.siteId)),
      )
      .limit(1),
    pool.query<PageAndReferrerRow>(
      pageAndReferrerQuery.replace("/* whereClause */", pageQuery.clause),
      pageQuery.parameters,
    ),
    pool.query<BreakdownRow>(
      breakdownQuery.replace("/* whereClause */", breakdownConditions.clause),
      breakdownConditions.parameters,
    ),
    eventNamesQuery(filters),
  ]);
  const totals = totalRows[0];

  const trendMap = new Map(trend.rows.map((row) => [`${row.index}:${row.period}`, row]));
  const buckets = period.buckets.map((bucket, index) => ({
    ...bucket,
    current: trendMap.get(`${index}:current`) ?? emptyMetrics,
    previous: trendMap.get(`${index}:previous`) ?? emptyMetrics,
  }));

  const { buckets: _buckets, ...periodSummary } = period;

  return {
    total: totals?.total ?? 0,
    visitors: totals?.visitors ?? 0,
    sessions: totals?.sessions ?? 0,
    pageViews: totals?.pageViews ?? 0,
    customEvents: totals?.customEvents ?? 0,
    trend: buckets,
    previous: previousRows[0] ?? emptyMetrics,
    period: periodSummary,
    retrievedAt: new Date().toISOString(),
    hasSiteActivity: activityRows.length > 0,
    breakdownTotal: filters.event ? (totals?.total ?? 0) : (totals?.pageViews ?? 0),
    breakdownMeasure: filters.event ? `${filters.event} events` : "Page views",
    pages: mappedLabelCounts(pageAndReferrerRows.rows.filter((row) => row.kind === "page")),
    referrers: mappedLabelCounts(pageAndReferrerRows.rows.filter((row) => row.kind === "referrer")),
    devices: mappedBreakdowns(breakdownRows.rows, "device"),
    browsers: mappedBreakdowns(breakdownRows.rows, "browser"),
    systems: mappedBreakdowns(breakdownRows.rows, "os"),
    countries: mappedBreakdowns(breakdownRows.rows, "country"),
    regions: mappedBreakdowns(breakdownRows.rows, "region"),
    eventNames: selectedEventNames(eventNames, filters.event),
  };
}

function eventNamesQuery(filters: AnalyticsFilters) {
  return db
    .selectDistinct({ name: siteEvents.eventName })
    .from(siteEvents)
    .where(
      and(eq(siteEvents.workspaceId, filters.workspaceId), eq(siteEvents.siteId, filters.siteId)),
    )
    .orderBy(siteEvents.eventName)
    .limit(EVENT_NAME_OPTIONS_LIMIT);
}

function selectedEventNames(rows: { name: string }[], selected?: string) {
  const options = new Set(rows.map((row) => row.name));
  if (selected && selected.length <= 128) options.add(selected);
  return [...options].sort((left, right) => left.localeCompare(right));
}

export async function getRecentEventsData(
  filters: AnalyticsFilters,
  requestedPage = 1,
  before?: string,
) {
  const period = analyticsPeriod(filters.from, filters.to);
  const timestamp = before ? Date.parse(before) : Number.NaN;
  // Keep pagination on the same population; reject malformed or out-of-range cutoffs.
  const snapshotAt =
    before !== undefined &&
    Number.isFinite(timestamp) &&
    new Date(timestamp).toISOString() === before &&
    timestamp >= Date.parse(period.from) &&
    timestamp <= Date.parse(period.to)
      ? before
      : period.to;
  filters = { ...filters, from: period.from, to: snapshotAt };
  const totals = await db.select({ total: count() }).from(siteEvents).where(conditions(filters));
  const total = totals[0]?.total ?? 0;
  const pageSize = 20;
  const pages = Math.max(1, Math.ceil(total / pageSize));
  const page =
    Number.isSafeInteger(requestedPage) && requestedPage > 0 ? Math.min(requestedPage, pages) : 1;
  const [events, names] = await Promise.all([
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
      .where(conditions(filters))
      .orderBy(desc(siteEvents.createdAt), desc(siteEvents.id))
      .limit(pageSize)
      .offset((page - 1) * pageSize),
    eventNamesQuery(filters),
  ]);
  return {
    total,
    page,
    pages,
    pageSize,
    snapshotAt,
    events,
    eventNames: selectedEventNames(names, filters.event),
    retrievedAt: new Date().toISOString(),
  };
}
