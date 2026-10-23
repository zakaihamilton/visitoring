"use client";

import Link from "next/link";
import {
  chartMeasures as measures,
  chartMetricOptions as metricOptions,
  chartInterval,
  type ChartMetric,
} from "./chart-data";
import { DropdownSelect } from "@/app/components/DropdownSelect";
import { useState } from "react";
import { useTrafficMetric } from "./TrafficMetric";
import { TrafficPlot } from "./TrafficPlot";
import styles from "../dashboard.module.css";
import { formatNumber, type DashboardData } from "./types";

export function ActivityChart({
  data,
  siteId,
  filters,
  initialMetric = "visitors",
}: {
  data: Pick<DashboardData, "trend" | "period" | "total" | "previous">;
  siteId: string;
  filters: Record<string, string>;
  initialMetric?: ChartMetric;
}) {
  const { metric: measure, setMetric: setMeasure } = useTrafficMetric(initialMetric);
  const [active, setActive] = useState(Math.max(0, data.trend.length - 1));
  const activeIndex = Math.min(active, data.trend.length - 1);
  const selected = data.trend[activeIndex];
  const hourly = data.period.granularity === "hour";
  const interval = (from: string, to: string) => chartInterval(from, to, hourly);
  const tableQuery = new URLSearchParams({ ...filters, site: siteId, metric: measure });
  return (
    <section className={`${styles.card} ${styles.trendCard}`} aria-label="Traffic trend">
      <div className={styles.cardTitle}>
        <div>
          <h2>Traffic over time</h2>
          <p>
            {data.period.granularity === "hour"
              ? "Hourly"
              : data.period.granularity === "day"
                ? "Daily"
                : data.period.granularity === "week"
                  ? "Weekly"
                  : "Monthly"}{" "}
            {measures[measure].toLowerCase()} · UTC
            {data.period.partial ? " · Today is partial" : ""}
          </p>
        </div>
        <div className={styles.chartSelect}>
          <label htmlFor="chart-metric">Metric</label>
          <DropdownSelect
            id="chart-metric"
            name="metric"
            aria-label="Metric"
            value={measure}
            onValueChange={(value) => setMeasure(value as ChartMetric)}
            options={metricOptions}
          />
        </div>
      </div>
      <div className={styles.chartLegend}>
        <span>
          <i className={styles.legendPage} />
          Selected period
        </span>
        <span>
          <i className={styles.legendPrevious} />
          Previous period
        </span>
      </div>
      <TrafficPlot
        buckets={data.trend}
        measure={measure}
        granularity={data.period.granularity}
        active={activeIndex}
        onActive={setActive}
      />
      <div className={styles.chartReadout} aria-live="polite">
        {selected ? (
          <>
            <div className={styles.readoutPeriod}>
              <span className={styles.readoutLabel}>
                <i className={styles.legendPage} />
                Selected period
              </span>
              <strong className={styles.readoutCurrent}>
                {formatNumber(selected.current[measure])}
                <small>{measures[measure].toLowerCase()}</small>
              </strong>
              <span className={styles.readoutDate}>{interval(selected.from, selected.to)}</span>
            </div>
            <div className={styles.readoutPeriod}>
              <span className={styles.readoutLabel}>
                <i className={styles.legendPrevious} />
                Previous period
              </span>
              <strong>
                {formatNumber(selected.previous[measure])}
                <small>{measures[measure].toLowerCase()}</small>
              </strong>
              <span className={styles.readoutDate}>
                {interval(selected.previousFrom, selected.previousTo)}
              </span>
            </div>
          </>
        ) : (
          "No activity in this period."
        )}
      </div>
      {!data.total && !data.previous.total ? (
        <p className={styles.noData}>
          No activity in either period. Try a different date range or clear your filters.
        </p>
      ) : null}
      <div className={styles.chartFooter}>
        <Link className={styles.tableToggle} href={`/dashboard/chart-data?${tableQuery}`}>
          View chart data
        </Link>
      </div>
    </section>
  );
}
