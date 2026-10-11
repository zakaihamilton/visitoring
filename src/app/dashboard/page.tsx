import Link from "next/link";
import { Suspense } from "react";
import { desc, eq } from "drizzle-orm";
import { requireUser } from "@/lib/auth";
import { db } from "@/db";
import { sites } from "@/db/schema";
import { getAnalyticsData } from "@/lib/analytics";
import { Topbar } from "@/app/components/Topbar";
import { Dashboard } from "./view";
import { DashboardLoading } from "./DashboardLoading";
import type { DashboardSite } from "./components/types";

export const dynamic = "force-dynamic";

type Props = { searchParams: Promise<Record<string, string | string[] | undefined>> };

function value(input: string | string[] | undefined): string | undefined {
  return typeof input === "string" ? input : undefined;
}

function safeDate(input: string | undefined, fallback: Date): Date {
  if (!input || !/^\d{4}-\d{2}-\d{2}$/.test(input)) return fallback;
  const date = new Date(`${input}T00:00:00.000Z`);
  return Number.isNaN(date.getTime()) || date.toISOString().slice(0, 10) !== input
    ? fallback
    : date;
}

type DashboardContentProps = {
  analyticsFilters: Parameters<typeof getAnalyticsData>[0];
  sites: DashboardSite[];
  siteId: string;
  filters: Record<string, string>;
};

async function DashboardContent({
  analyticsFilters,
  sites,
  siteId,
  filters,
}: DashboardContentProps) {
  const data = await getAnalyticsData(analyticsFilters);
  return <Dashboard sites={sites} siteId={siteId} data={data} filters={filters} />;
}

export default async function DashboardPage({ searchParams }: Props) {
  const [user, params] = await Promise.all([requireUser(), searchParams]);
  const now = new Date();
  const defaultFrom = new Date(now);
  defaultFrom.setUTCHours(0, 0, 0, 0);
  defaultFrom.setUTCDate(defaultFrom.getUTCDate() - 29);
  const workspaceSites = await db
    .select({ id: sites.id, name: sites.name })
    .from(sites)
    .where(eq(sites.workspaceId, user.workspaceId))
    .orderBy(desc(sites.createdAt));
  const selectedSite =
    workspaceSites.find((site) => site.id === value(params.site)) ?? workspaceSites[0];
  const requestedFrom = value(params.from);
  const requestedTo = value(params.to);
  const from = safeDate(requestedFrom, defaultFrom);
  const to = safeDate(requestedTo, now);
  return (
    <>
      <Topbar user={user} section="dashboard" />
      {selectedSite ? (
        <Suspense fallback={<DashboardLoading />}>
          <DashboardContent
            sites={workspaceSites}
            siteId={selectedSite.id}
            analyticsFilters={{
              workspaceId: user.workspaceId,
              siteId: selectedSite.id,
              from: from.toISOString(),
              to: new Date(to.setUTCHours(23, 59, 59, 999)).toISOString(),
              event: value(params.event),
              path: value(params.path),
              property: value(params.property),
              propertyValue: value(params.propertyValue),
              visitor: value(params.visitor),
              session: value(params.session),
            }}
            filters={{
              from: requestedFrom ?? defaultFrom.toISOString().slice(0, 10),
              to: requestedTo ?? now.toISOString().slice(0, 10),
              event: value(params.event) ?? "",
              path: value(params.path) ?? "",
              property: value(params.property) ?? "",
              propertyValue: value(params.propertyValue) ?? "",
              visitor: value(params.visitor) ?? "",
              session: value(params.session) ?? "",
            }}
          />
        </Suspense>
      ) : (
        <main className="emptyState">
          <div className="eyebrow">Set up your first site</div>
          <h1>Analytics start with a site.</h1>
          <p>Add a site and its tracking snippet to start seeing page views and events.</p>
          {user.role === "admin" ? (
            <Link className="button buttonPrimary" href="/settings/sites">
              Open settings
            </Link>
          ) : (
            <p>Ask your project administrator to add a site.</p>
          )}
        </main>
      )}
    </>
  );
}
