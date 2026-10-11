import { Tooltip } from "@/app/components/Tooltip";
import styles from "../dashboard.module.css";
import { formatNumber, type DashboardData } from "./types";

export function ActivityChart({ data }: { data: DashboardData }) {
  const maxTrend = Math.max(1, ...data.trend.map((day) => day.total));

  return (
    <section className={`${styles.card} ${styles.chartCard}`}>
      <div className={styles.cardTitle}>
        <div>
          <div className={styles.chartHeading}>
            <h2>Activity over time</h2>
            <Tooltip
              label="Activity over time"
              content="Each bar shows total events and page views for one day. Dates use UTC."
            />
          </div>
          <p>Daily events and page views · UTC</p>
        </div>
        <span>Last {data.trend.length} days</span>
      </div>
      {data.total ? (
        <section className={styles.chart} aria-label="Daily event volume bar chart">
          {data.trend.map((day) => (
            <Tooltip
              key={day.day}
              content={`${day.day}: ${day.total} events, ${day.pageViews} page views`}
              label={`Activity on ${day.day}`}
              targetElement="div"
              targetClassName={styles.barColumn}
              targetRole="img"
              targetAriaLabel={`Activity on ${day.day}`}
            >
              <div
                className={styles.bar}
                style={{ height: `${Math.max(day.total ? 5 : 0, (day.total / maxTrend) * 100)}%` }}
              >
                <span style={{ height: `${day.total ? (day.pageViews / day.total) * 100 : 0}%` }} />
              </div>
            </Tooltip>
          ))}
        </section>
      ) : (
        <div className={styles.chartEmpty}>
          <span>✳</span>
          <p>Activity will show here after your first event arrives.</p>
        </div>
      )}
      <div className={styles.chartLegend}>
        <span>
          <i className={styles.legendTotal} /> Total events
        </span>
        <span>
          <i className={styles.legendPage} /> Page views: {formatNumber(data.pageViews)}
        </span>
      </div>
    </section>
  );
}
