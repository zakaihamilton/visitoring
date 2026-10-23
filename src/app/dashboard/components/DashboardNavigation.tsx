"use client";

import { useTrafficMetric } from "./TrafficMetric";
import Link from "next/link";
import styles from "../dashboard.module.css";

export function DashboardNavigation({
  siteId,
  filters,
  current,
}: {
  siteId: string;
  filters: Record<string, string>;
  current: "overview" | "events" | "chart-data";
}) {
  const { metric } = useTrafficMetric(filters.metric);
  const params = new URLSearchParams(
    Object.entries({ ...filters, metric, site: siteId }).filter(([, value]) => value),
  );
  return (
    <nav className={styles.dashboardNavigation} aria-label="Traffic navigation">
      <Link
        href={`/dashboard?${params}`}
        aria-current={current === "overview" ? "page" : undefined}
      >
        Traffic overview
      </Link>
      <Link
        href={`/dashboard/events?${params}`}
        aria-current={current === "events" ? "page" : undefined}
      >
        Recent events
      </Link>
      <Link
        href={`/dashboard/chart-data?${params}`}
        aria-current={current === "chart-data" ? "page" : undefined}
      >
        Chart data
      </Link>
    </nav>
  );
}
