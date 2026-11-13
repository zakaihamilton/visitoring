import Link from "next/link";
import { RecentEventsTable } from "../components/RecentEventsTable";
import type { DashboardProps, RecentEventsData } from "../components/types";
import styles from "../dashboard.module.css";
import { TrafficPageControls } from "../components/TrafficPageControls";
import { TrafficPageHeader } from "../components/TrafficPageHeader";

type Props = Omit<DashboardProps, "data"> & { data: RecentEventsData };
export function RecentEventsView({ sites, siteId, data, filters }: Props) {
  const site = sites.find((item) => item.id === siteId);
  function pageHref(page: number) {
    return `/dashboard/events?${new URLSearchParams({ ...filters, site: siteId, before: data.snapshotAt, page: String(page) })}`;
  }
  return (
    <main className={styles.main}>
      <TrafficPageHeader
        siteName={site?.name ?? "Site activity"}
        title="Recent events"
        filters={filters}
        retrievedAt={data.retrievedAt}
      />
      <TrafficPageControls
        sites={sites}
        siteId={siteId}
        data={data}
        filters={filters}
        retrievedAt={data.retrievedAt}
        pathname="/dashboard/events"
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
