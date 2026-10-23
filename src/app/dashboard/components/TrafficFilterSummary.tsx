"use client";

import { useTrafficMetric } from "./TrafficMetric";
import Link from "next/link";
import styles from "../dashboard.module.css";

export function TrafficFilterSummary({
  siteId,
  filters,
  retrievedAt,
  pathname = "/dashboard",
}: {
  siteId: string;
  filters: Record<string, string>;
  retrievedAt: string;
  pathname?: "/dashboard" | "/dashboard/events" | "/dashboard/chart-data";
}) {
  const { metric } = useTrafficMetric(filters.metric);
  const labels: Record<string, string> = {
    event: "Event",
    path: "Page",
    property: "Detail name",
    propertyValue: "Detail value",
    visitor: "Visitor",
    session: "Session",
  };
  const active = Object.entries(labels).filter(([key]) => filters[key]);
  const today = retrievedAt.slice(0, 10);
  return (
    <div className={styles.filterSummary}>
      <nav className={styles.dateShortcuts} aria-label="Date shortcuts">
        {[
          { label: "Today", days: 1 },
          { label: "Last 7 days", days: 7 },
          { label: "Last 30 days", days: 30 },
        ].map(({ label, days }) => {
          const from = new Date(Date.parse(today) - (days - 1) * 86_400_000)
            .toISOString()
            .slice(0, 10);
          const params = new URLSearchParams({ ...filters, metric, site: siteId, from, to: today });
          return (
            <Link
              key={label}
              href={`${pathname}?${params}`}
              aria-current={filters.from === from && filters.to === today ? "date" : undefined}
            >
              {label}
            </Link>
          );
        })}
        <Link href={`${pathname}?site=${encodeURIComponent(siteId)}`}>Reset filters</Link>
      </nav>
      {active.length ? (
        <section className={styles.activeFilters} aria-label="Active filters">
          {active.map(([key, label]) => (
            <span key={key}>
              {label}: {filters[key]}
            </span>
          ))}
        </section>
      ) : null}
    </div>
  );
}
