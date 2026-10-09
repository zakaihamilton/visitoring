import {
  bigserial,
  index,
  integer,
  jsonb,
  pgTable,
  text,
  timestamp,
  uniqueIndex,
  uuid,
  varchar,
} from "drizzle-orm/pg-core";

export const workspaces = pgTable(
  "workspaces",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    name: varchar("name", { length: 120 }).notNull(),
    slug: varchar("slug", { length: 80 }).notNull().unique(),
    organizationId: uuid("organization_id").notNull(),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [index("workspaces_organization_idx").on(table.organizationId)],
);

export const authRateLimitBuckets = pgTable(
  "auth_rate_limit_buckets",
  {
    bucketKey: varchar("bucket_key", { length: 64 }).primaryKey(),
    windowStartedAt: timestamp("window_started_at", { withTimezone: true }).notNull(),
    count: integer("count").notNull().default(1),
  },
  (table) => [index("auth_rate_limit_window_idx").on(table.windowStartedAt)],
);

export const sites = pgTable(
  "sites",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    workspaceId: uuid("workspace_id")
      .notNull()
      .references(() => workspaces.id, { onDelete: "cascade" }),
    name: varchar("name", { length: 120 }).notNull(),
    allowedDomains: text("allowed_domains").array().notNull().default([]),
    siteKeyHash: varchar("site_key_hash", { length: 64 }).notNull(),
    siteKeyPrefix: varchar("site_key_prefix", { length: 16 }).notNull(),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [index("sites_workspace_idx").on(table.workspaceId)],
);

export const siteEvents = pgTable(
  "site_events",
  {
    id: bigserial("id", { mode: "number" }).primaryKey(),
    workspaceId: uuid("workspace_id")
      .notNull()
      .references(() => workspaces.id, { onDelete: "cascade" }),
    siteId: uuid("site_id")
      .notNull()
      .references(() => sites.id, { onDelete: "cascade" }),
    visitorId: varchar("visitor_id", { length: 64 }).notNull(),
    sessionId: varchar("session_id", { length: 64 }).notNull(),
    eventName: varchar("event_name", { length: 128 }).notNull(),
    path: varchar("path", { length: 1024 }).notNull(),
    referrerHost: varchar("referrer_host", { length: 253 }),
    properties: jsonb("properties").$type<Record<string, unknown>>().notNull().default({}),
    device: varchar("device", { length: 24 }),
    browser: varchar("browser", { length: 24 }),
    os: varchar("os", { length: 24 }),
    country: varchar("country", { length: 2 }),
    region: varchar("region", { length: 16 }),
    createdAt: timestamp("created_at", { withTimezone: true, mode: "string" })
      .notNull()
      .defaultNow(),
  },
  (table) => [
    index("site_events_site_time_idx").on(table.siteId, table.createdAt),
    index("site_events_workspace_time_idx").on(table.workspaceId, table.createdAt),
    index("site_events_site_name_time_idx").on(table.siteId, table.eventName, table.createdAt),
    index("site_events_site_visitor_idx").on(table.siteId, table.visitorId),
    index("site_events_site_session_idx").on(table.siteId, table.sessionId),
  ],
);

export const rateLimitBuckets = pgTable(
  "rate_limit_buckets",
  {
    id: bigserial("id", { mode: "number" }).primaryKey(),
    siteId: uuid("site_id")
      .notNull()
      .references(() => sites.id, { onDelete: "cascade" }),
    ipHash: varchar("ip_hash", { length: 64 }).notNull(),
    windowStartedAt: timestamp("window_started_at", { withTimezone: true }).notNull(),
    count: integer("count").notNull().default(1),
  },
  (table) => [
    uniqueIndex("rate_limit_site_ip_idx").on(table.siteId, table.ipHash),
    index("rate_limit_window_idx").on(table.windowStartedAt),
  ],
);
