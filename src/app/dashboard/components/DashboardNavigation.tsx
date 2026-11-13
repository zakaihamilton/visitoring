"use client";

import Link from "next/link";
import { useTrafficMetric } from "./TrafficMetric";
import styles from "../dashboard.module.css";

export function DashboardNavigation({
  siteId,
  filters,
  current,
  variant,
}: {
  siteId?: string;
  filters: Record<string, string>;
  current: "overview" | "events" | "chart-data";
  variant?: "sidebar";
}) {
  const { metric } = useTrafficMetric(filters.metric);
  const params = new URLSearchParams(
    Object.entries({ ...filters, metric, ...(siteId ? { site: siteId } : {}) }).filter(
      ([, value]) => value,
    ),
  );
  const query = params.toString();
  const href = (path: string) => (query ? path + "?" + query : path);
  const navClass = variant === "sidebar" ? "pf-sidebar-group" : styles.dashboardNavigation;
  const linkClass = variant === "sidebar" ? "pf-sidebar-link" : undefined;

  return (
    <nav className={navClass} aria-label="Traffic navigation">
      {variant === "sidebar" ? <p className="pf-sidebar-group-label">Analytics</p> : null}
      <Link className={linkClass} href={href("/dashboard")} aria-current={current === "overview" ? "page" : undefined}>
        Traffic overview
      </Link>
      <Link className={linkClass} href={href("/dashboard/events")} aria-current={current === "events" ? "page" : undefined}>
        Recent events
      </Link>
      <Link className={linkClass} href={href("/dashboard/chart-data")} aria-current={current === "chart-data" ? "page" : undefined}>
        Chart data
      </Link>
    </nav>
  );
}
