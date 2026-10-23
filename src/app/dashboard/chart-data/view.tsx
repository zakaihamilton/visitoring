import Form from "next/form";
import { DataFreshness } from "../components/DataFreshness";
/* eslint-disable jsx-a11y/no-noninteractive-tabindex -- Scrollable tables need keyboard access. */
import { DropdownSelect } from "@/app/components/DropdownSelect";
import { dateLabel } from "@/lib/analytics-period";
import { DashboardNavigation } from "../components/DashboardNavigation";
import { DashboardFiltersForm } from "../components/DashboardFilters";
import { TrafficFilterSummary } from "../components/TrafficFilterSummary";
import {
  chartMeasures,
  chartMetric,
  chartMetricOptions,
  chartInterval,
} from "../components/chart-data";
import { formatNumber, type DashboardProps } from "../components/types";
import styles from "../dashboard.module.css";

export function ChartDataView({ sites, siteId, data, filters }: DashboardProps) {
  const measure = chartMetric(filters.metric);
  const site = sites.find((item) => item.id === siteId);
  const hourly = data.period.granularity === "hour";
  return (
    <main className={styles.main}>
      <div className={styles.heading}>
        <div>
          <div className="eyebrow">{site?.name ?? "Site activity"}</div>
          <h1>Chart data</h1>
          <p>
            {dateLabel(`${filters.from}T00:00:00Z`, false, true)} –{" "}
            {dateLabel(`${filters.to}T00:00:00Z`, false, true)} · UTC
            {data.period.partial ? " · Today is partial" : ""}
          </p>
        </div>
        <DataFreshness retrievedAt={data.retrievedAt} />
      </div>
      <DashboardNavigation siteId={siteId} filters={filters} current="chart-data" />
      <TrafficFilterSummary
        siteId={siteId}
        filters={filters}
        retrievedAt={data.retrievedAt}
        pathname="/dashboard/chart-data"
      />
      <DashboardFiltersForm
        key={`${siteId}:${JSON.stringify(filters)}`}
        sites={sites}
        siteId={siteId}
        data={data}
        filters={filters}
      />
      <section className={styles.card}>
        <div className={styles.cardTitle}>
          <div>
            <h2>Interval comparison</h2>
            <p>
              {data.period.granularity === "hour"
                ? "Hourly"
                : data.period.granularity === "day"
                  ? "Daily"
                  : data.period.granularity === "week"
                    ? "Weekly"
                    : "Monthly"}{" "}
              counts for the selected and previous periods.
            </p>
          </div>
        </div>
        <Form className={styles.chartMetricForm} action="" scroll={false}>
          <input type="hidden" name="site" value={siteId} />
          {Object.entries(filters)
            .filter(([key]) => key !== "metric")
            .map(([key, value]) => (
              <input key={key} type="hidden" name={key} value={value} />
            ))}
          <div className={styles.chartSelect}>
            <label htmlFor="table-metric">Metric</label>
            <DropdownSelect
              id="table-metric"
              name="metric"
              aria-label="Metric"
              options={chartMetricOptions}
              defaultValue={measure}
            />
          </div>
          <button className="button buttonQuiet" type="submit">
            Apply metric
          </button>
        </Form>
        <p className={styles.comparisonNote}>
          {chartMeasures[measure]} are counted within each interval.
          {measure === "visitors" || measure === "sessions"
            ? " Distinct interval counts may not add up to the period total."
            : ""}
          {data.period.partial ? " Both periods use the same elapsed time." : ""}
        </p>
        {/* biome-ignore lint/a11y/noNoninteractiveTabindex: Scrollable tables need keyboard access. */}
        <section className={styles.chartData} tabIndex={0} aria-label="Chart data table">
          <table>
            <caption>{chartMeasures[measure]} · UTC</caption>
            <thead>
              <tr>
                <th scope="col">Selected interval</th>
                <th scope="col">Count</th>
                <th scope="col">Previous interval</th>
                <th scope="col">Count</th>
              </tr>
            </thead>
            <tbody>
              {data.trend.map((bucket) => (
                <tr key={bucket.from}>
                  <th scope="row">{chartInterval(bucket.from, bucket.to, hourly)}</th>
                  <td>{formatNumber(bucket.current[measure])}</td>
                  <td>{chartInterval(bucket.previousFrom, bucket.previousTo, hourly)}</td>
                  <td>{formatNumber(bucket.previous[measure])}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </section>
        {!data.total && !data.previous.total ? (
          <p className={styles.noData}>
            No activity in either period. Try a different date range or clear your filters.
          </p>
        ) : null}
      </section>
    </main>
  );
}
