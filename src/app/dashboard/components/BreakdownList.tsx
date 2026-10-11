import { Tooltip } from "@/app/components/Tooltip";
import styles from "../dashboard.module.css";
import { formatNumber } from "./types";

export function BreakdownList({
  title,
  rows,
  empty = "No activity yet",
  showLabelTooltips = true,
}: {
  title: string;
  rows: Array<{ label: string; count: number }>;
  empty?: string;
  showLabelTooltips?: boolean;
}) {
  const max = Math.max(1, ...rows.map((row) => row.count));

  return (
    <section className={styles.card}>
      <div className={styles.cardTitle}>
        <h2>{title}</h2>
        <span>Top 8</span>
      </div>
      {rows.length ? (
        <div className={styles.breakdown}>
          {rows.map((row) => (
            <div className={styles.breakdownRow} key={`${row.label}-${row.count}`}>
              <div className={styles.breakdownLabel}>
                {showLabelTooltips ? (
                  <Tooltip
                    label={`${title} value`}
                    content={row.label}
                    targetClassName={styles.truncatedLabel}
                    targetTabIndex={-1}
                  >
                    {row.label}
                  </Tooltip>
                ) : (
                  <span className={styles.truncatedLabel}>{row.label}</span>
                )}
                <b>{formatNumber(row.count)}</b>
              </div>
              <div className={styles.track}>
                <span style={{ width: `${Math.max(3, (row.count / max) * 100)}%` }} />
              </div>
            </div>
          ))}
        </div>
      ) : (
        <p className={styles.noData}>{empty}</p>
      )}
    </section>
  );
}
