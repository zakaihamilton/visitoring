import { DataFreshness } from "../components/DataFreshness";
import Link from "next/link";
import { dateLabel } from "@/lib/analytics-period";
import { DashboardNavigation } from "../components/DashboardNavigation";
import { DashboardFiltersForm } from "../components/DashboardFilters";
import { TrafficFilterSummary } from "../components/TrafficFilterSummary";
import { RecentEventsTable } from "../components/RecentEventsTable";
import type { DashboardProps, RecentEventsData } from "../components/types";
import styles from "../dashboard.module.css";

type Props = Omit<DashboardProps, "data"> & { data: RecentEventsData };
export function RecentEventsView({ sites, siteId, data, filters }: Props) {
  const site = sites.find((item) => item.id === siteId);
  function pageHref(page: number) {
    return `/dashboard/events?${new URLSearchParams({ ...filters, site: siteId, before: data.snapshotAt, page: String(page) })}`;
  }
  return (
    <main className={styles.main}>
      <div className={styles.heading}>
        <div>
          <div className="eyebrow">{site?.name ?? "Site activity"}</div>
          <h1>Recent events</h1>
          <p>
            {dateLabel(`${filters.from}T00:00:00Z`, false, true)} –{" "}
            {dateLabel(`${filters.to}T00:00:00Z`, false, true)} · UTC
          </p>
        </div>
        <DataFreshness retrievedAt={data.retrievedAt} />
      </div>
      <DashboardNavigation siteId={siteId} filters={filters} current="events" />
      <TrafficFilterSummary
        siteId={siteId}
        filters={filters}
        retrievedAt={data.retrievedAt}
        pathname="/dashboard/events"
      />
      <DashboardFiltersForm
        key={`${siteId}:${JSON.stringify(filters)}`}
        sites={sites}
        siteId={siteId}
        data={data}
        filters={filters}
      />
      <RecentEventsTable data={data} />
      {data.pages > 1 ? (
        <nav className={styles.eventPagination} aria-label="Event pages">
          {data.page > 1 ? (
            <Link className="button buttonQuiet" href={pageHref(data.page - 1)}>
              Newer events
            </Link>
          ) : (
            <span />
          )}
          <span>
            Page {data.page} of {data.pages}
          </span>
          {data.page < data.pages ? (
            <Link className="button buttonQuiet" href={pageHref(data.page + 1)}>
              Older events
            </Link>
          ) : (
            <span />
          )}
        </nav>
      ) : null}
    </main>
  );
}
