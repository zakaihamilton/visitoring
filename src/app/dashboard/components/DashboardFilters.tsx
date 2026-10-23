"use client";

import Form from "next/form";
import { useState } from "react";
import { useTrafficMetric } from "./TrafficMetric";
import { CoreDashboardFilters } from "./CoreDashboardFilters";
import type { DashboardData, DashboardSite } from "./types";
import styles from "../dashboard.module.css";

export function DashboardFiltersForm({
  sites,
  siteId,
  data,
  filters,
  dateError,
}: {
  dateError?: string;
  sites: DashboardSite[];
  siteId: string;
  data: Pick<DashboardData, "eventNames">;
  filters: Record<string, string>;
}) {
  const [expanded, setExpanded] = useState(Boolean(dateError));
  const { metric } = useTrafficMetric(filters.metric);
  return (
    <section className={styles.filterPanel} aria-label="Traffic filters">
      <button
        type="button"
        className={`button buttonQuiet ${styles.filterToggle}`}
        aria-expanded={expanded}
        aria-controls="traffic-filter-fields"
        onClick={() => setExpanded(!expanded)}
      >
        {expanded ? "Hide filters" : "Edit filters"}
      </button>
      <div id="traffic-filter-fields" className={styles.filterPanelBody} data-expanded={expanded}>
        {dateError ? (
          <p id="date-range-error" className={styles.dateError} role="alert">
            {dateError}
          </p>
        ) : null}
        <Form className={styles.filters} action="" scroll={false}>
          <input type="hidden" name="metric" value={metric} />
          {["property", "propertyValue", "visitor", "session"].map((name) =>
            filters[name] ? (
              <input key={name} type="hidden" name={name} value={filters[name]} />
            ) : null,
          )}
          <CoreDashboardFilters
            sites={sites}
            siteId={siteId}
            data={data}
            filters={filters}
            dateError={dateError}
          />
          <button type="submit" className="button buttonPrimary">
            Apply filters
          </button>
        </Form>
      </div>
    </section>
  );
}
