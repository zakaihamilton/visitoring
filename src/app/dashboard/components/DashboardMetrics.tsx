import { Tooltip } from "@/app/components/Tooltip";
import styles from "../dashboard.module.css";
import { formatNumber, type DashboardData } from "./types";

export function DashboardMetrics({ data }: { data: DashboardData }) {
  return (
    <div className={styles.metrics}>
      <article className={styles.metric}>
        <div className={styles.metricLabel}>
          <span>Page views</span>
          <Tooltip label="Page views" content="Counts page_view events." />
        </div>
        <strong>{formatNumber(data.pageViews)}</strong>
        <small>Tracked page views</small>
      </article>
      <article className={styles.metric}>
        <div className={styles.metricLabel}>
          <span>Visitors</span>
          <Tooltip
            label="Visitors"
            content="Count of distinct anonymous visitor codes in the selected results."
          />
        </div>
        <strong>{formatNumber(data.visitors)}</strong>
        <small>People counted without names</small>
      </article>
      <article className={styles.metric}>
        <div className={styles.metricLabel}>
          <span>Sessions</span>
          <Tooltip
            label="Sessions"
            content="Count of distinct browser session codes in the selected results."
          />
        </div>
        <strong>{formatNumber(data.sessions)}</strong>
        <small>Visits within a browser session</small>
      </article>
      <article className={styles.metric}>
        <div className={styles.metricLabel}>
          <span>Custom events</span>
          <Tooltip
            label="Custom events"
            content="Events other than page_view, such as a signup."
          />
        </div>
        <strong>{formatNumber(data.customEvents)}</strong>
        <small>{formatNumber(data.total)} total, including page views</small>
      </article>
    </div>
  );
}
