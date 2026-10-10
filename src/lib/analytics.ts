import { and, count, desc, eq, gte, ilike, lte, sql } from "drizzle-orm";
import type { AnyPgColumn } from "drizzle-orm/pg-core";
import { db } from "@/db";
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

type Breakdown = { label: string; count: number };

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

async function breakdown(column: AnyPgColumn, filters: AnalyticsFilters): Promise<Breakdown[]> {
  const rows = await db
    .select({
      label: sql<string>`coalesce(${column}, 'Unknown')`,
      count: count(),
    })
    .from(siteEvents)
    .where(conditions(filters))
    .groupBy(column)
    .orderBy(desc(count()))
    .limit(8);
  return rows.map((row) => ({ label: row.label, count: row.count }));
}

export async function getAnalyticsData(filters: AnalyticsFilters) {
  const where = conditions(filters);
  const pageWhere = filters.event ? where : and(where, eq(siteEvents.eventName, "page_view"));
  const [totals] = await db
    .select({
      total: count(),
      visitors: sql<number>`count(distinct ${siteEvents.visitorId})::int`,
      sessions: sql<number>`count(distinct ${siteEvents.sessionId})::int`,
      pageViews: sql<number>`count(*) filter (where ${siteEvents.eventName} = 'page_view')::int`,
      customEvents: sql<number>`count(*) filter (where ${siteEvents.eventName} <> 'page_view')::int`,
    })
    .from(siteEvents)
    .where(where);

  const dayExpression = sql<string>`to_char(${siteEvents.createdAt} at time zone 'UTC', 'YYYY-MM-DD')`;
  const [
    trend,
    pages,
    referrers,
    devices,
    browsers,
    systems,
    countries,
    regions,
    eventRows,
    eventNames,
  ] = await Promise.all([
    db
      .select({
        day: dayExpression,
        total: count(),
        pageViews: sql<number>`count(*) filter (where ${siteEvents.eventName} = 'page_view')::int`,
      })
      .from(siteEvents)
      .where(where)
      .groupBy(dayExpression)
      .orderBy(dayExpression),
    db
      .select({ label: siteEvents.path, count: count() })
      .from(siteEvents)
      .where(pageWhere)
      .groupBy(siteEvents.path)
      .orderBy(desc(count()))
      .limit(6),
    db
      .select({
        label: sql<string>`coalesce(${siteEvents.referrerHost}, 'Direct')`,
        count: count(),
      })
      .from(siteEvents)
      .where(pageWhere)
      .groupBy(siteEvents.referrerHost)
      .orderBy(desc(count()))
      .limit(6),
    breakdown(siteEvents.device, filters),
    breakdown(siteEvents.browser, filters),
    breakdown(siteEvents.os, filters),
    breakdown(siteEvents.country, filters),
    breakdown(siteEvents.region, filters),
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
        and(eq(siteEvents.workspaceId, filters.workspaceId), eq(siteEvents.siteId, filters.siteId)),
      )
      .orderBy(siteEvents.eventName)
      .limit(EVENT_NAME_OPTIONS_LIMIT),
  ]);

  const fromDay = new Date(filters.from);
  fromDay.setUTCHours(0, 0, 0, 0);
  const toDay = new Date(filters.to);
  toDay.setUTCHours(0, 0, 0, 0);
  const dayCount = Math.max(1, Math.floor((toDay.getTime() - fromDay.getTime()) / 86_400_000) + 1);
  const dayLimit = Math.min(dayCount, 90);
  const start = new Date(toDay);
  start.setUTCDate(start.getUTCDate() - (dayLimit - 1));
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
    pages: pages.map((row) => ({ label: row.label, count: row.count })),
    referrers: referrers.map((row) => ({ label: row.label, count: row.count })),
    devices,
    browsers,
    systems,
    countries,
    regions,
    events: eventRows,
    eventNames: [...eventNameOptions].sort((left, right) => left.localeCompare(right)),
  };
}
