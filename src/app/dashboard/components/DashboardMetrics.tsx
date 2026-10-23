import { Tooltip } from "@/app/components/Tooltip";
import { metricChange, dateLabel } from "@/lib/analytics-period";
import styles from "../dashboard.module.css";
import { formatNumber, type DashboardData } from "./types";

const metrics = [
  {
    key: "visitors",
    label: "Visitors",
    help: "Distinct anonymous visitor codes in the matching events.",
  },
  { key: "pageViews", label: "Page views", help: "Counts page_view events." },
  {
    key: "sessions",
    label: "Sessions",
    help: "Distinct browser session codes in the matching events.",
  },
  {
    key: "customEvents",
    label: "Custom events",
    help: "Events other than page_view, such as a signup.",
  },
] as const;

export function DashboardMetrics({ data }: { data: DashboardData }) {
  return (
    <>
      <div className={styles.metrics}>
        {metrics.map(({ key, label, help }) => (
          <article className={styles.metric} key={key}>
            <div className={styles.metricLabel}>
              <span>{label}</span>
              <Tooltip label={label} content={help} />
            </div>
            <strong>{formatNumber(data[key])}</strong>
            <small>
              <b
                className={
                  data[key] === data.previous[key] || !data.previous[key]
                    ? styles.changeNeutral
                    : data[key] > data.previous[key]
                      ? styles.changeUp
                      : styles.changeDown
                }
              >
                {metricChange(data[key], data.previous[key])}
              </b>
              <br />
              Previous: {formatNumber(data.previous[key])}
            </small>
          </article>
        ))}
      </div>
      <p className={styles.comparisonNote}>
        Compared with {dateLabel(data.period.previousFrom, false, true)} –{" "}
        {dateLabel(
          new Date(Date.parse(data.period.previousTo) - 1).toISOString(),
          data.period.partial,
          true,
        )}{" "}
        · UTC
        {data.period.partial ? " · Today is partial; both periods use the same elapsed time." : ""}
      </p>
    </>
  );
}
