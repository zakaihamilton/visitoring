"use client";

import Form from "next/form";
import { useState } from "react";
import { CoreDashboardFilters } from "./CoreDashboardFilters";
import styles from "./DashboardFilters.module.css";
import { useTrafficMetric } from "./TrafficMetric";
import type { DashboardFilterFormProps } from "./types";

export function DashboardFiltersForm({
  sites,
  siteId,
  data,
  filters,
  dateError,
}: DashboardFilterFormProps) {
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
