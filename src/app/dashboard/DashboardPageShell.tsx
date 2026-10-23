import Link from "next/link";
import { Suspense } from "react";
import { desc, eq } from "drizzle-orm";
import { requireUser } from "@/lib/auth";
import { db } from "@/db";
import { sites } from "@/db/schema";
import { getAnalyticsData, getRecentEventsData } from "@/lib/analytics";
import { dashboardDates } from "@/lib/analytics-period";
import { Topbar } from "@/app/components/Topbar";
import { Dashboard } from "./view";
import { DashboardLoading } from "./DashboardLoading";
import { RecentEventsView } from "./events/view";
import { ChartDataView } from "./chart-data/view";
import { TrafficLoading } from "./components/TrafficLoading";
import { chartMetric } from "./components/chart-data";
import { TrafficMetricProvider } from "./components/TrafficMetric";
import { DashboardFiltersForm } from "./components/DashboardFilters";
import { DashboardNavigation } from "./components/DashboardNavigation";
import { TrafficFilterSummary } from "./components/TrafficFilterSummary";
import styles from "./dashboard.module.css";
import type { DashboardSite } from "./components/types";

type Props = {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
  view: "overview" | "events" | "chart-data";
};

function value(input: string | string[] | undefined): string | undefined {
  return typeof input === "string" ? input : undefined;
}

type DashboardContentProps = {
  analyticsFilters: Parameters<typeof getAnalyticsData>[0];
  sites: DashboardSite[];
  siteId: string;
  filters: Record<string, string>;
  view: "overview" | "events" | "chart-data";
  page: number;
  before?: string;
};

async function DashboardContent({
  analyticsFilters,
  sites,
  siteId,
  filters,
  view,
  page,
  before,
}: DashboardContentProps) {
  if (view === "events") {
    const data = await getRecentEventsData(analyticsFilters, page, before);
    return <RecentEventsView sites={sites} siteId={siteId} data={data} filters={filters} />;
  }
  const data = await getAnalyticsData(analyticsFilters);
  if (view === "chart-data")
    return <ChartDataView sites={sites} siteId={siteId} data={data} filters={filters} />;
  return <Dashboard sites={sites} siteId={siteId} data={data} filters={filters} />;
}

export async function DashboardPageShell({ searchParams, view }: Props) {
  const [user, params] = await Promise.all([requireUser(), searchParams]);
  const now = new Date();
  const workspaceSites = await db
    .select({ id: sites.id, name: sites.name })
    .from(sites)
    .where(eq(sites.workspaceId, user.workspaceId))
    .orderBy(desc(sites.createdAt));
  const selectedSite =
    workspaceSites.find((site) => site.id === value(params.site)) ?? workspaceSites[0];
  const dates = dashboardDates(value(params.from), value(params.to), now);
  const filters: Record<string, string> = {
    from: dates.from,
    to: dates.to,
    event: value(params.event) ?? "",
    path: value(params.path) ?? "",
    property: value(params.property) ?? "",
    propertyValue: value(params.propertyValue) ?? "",
    visitor: value(params.visitor) ?? "",
    session: value(params.session) ?? "",
    ...(value(params.metric) ? { metric: chartMetric(value(params.metric)) } : {}),
  };
  return (
    <>
      <Topbar user={user} section="dashboard" />
      <TrafficMetricProvider key={JSON.stringify(filters)} initialMetric={filters.metric}>
        {selectedSite && dates.error ? (
          <main className={styles.main}>
            <div className={styles.heading}>
              <div>
                <div className="eyebrow">{selectedSite.name}</div>
                <h1>
                  {view === "events"
                    ? "Recent events"
                    : view === "chart-data"
                      ? "Chart data"
                      : "Traffic, at a glance."}
                </h1>
                <p>Adjust your date range · UTC</p>
              </div>
            </div>
            <DashboardNavigation siteId={selectedSite.id} filters={filters} current={view} />
            <TrafficFilterSummary
              siteId={selectedSite.id}
              filters={filters}
              retrievedAt={now.toISOString()}
              pathname={view === "overview" ? "/dashboard" : `/dashboard/${view}`}
            />
            <DashboardFiltersForm
              sites={workspaceSites}
              siteId={selectedSite.id}
              filters={filters}
              data={{ eventNames: filters.event ? [filters.event] : [] }}
              dateError={dates.error}
            />
          </main>
        ) : selectedSite ? (
          <Suspense
            fallback={
              view === "events" ? (
                <TrafficLoading view="events" />
              ) : view === "chart-data" ? (
                <TrafficLoading view="chart-data" />
              ) : (
                <DashboardLoading />
              )
            }
          >
            <DashboardContent
              view={view}
              sites={workspaceSites}
              siteId={selectedSite.id}
              analyticsFilters={{
                workspaceId: user.workspaceId,
                siteId: selectedSite.id,
                from: `${dates.from}T00:00:00.000Z`,
                to: `${dates.to}T23:59:59.999Z`,
                event: value(params.event),
                path: value(params.path),
                property: value(params.property),
                propertyValue: value(params.propertyValue),
                visitor: value(params.visitor),
                session: value(params.session),
              }}
              filters={filters}
              page={Number(value(params.page))}
              before={value(params.before)}
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
      </TrafficMetricProvider>
    </>
  );
}
