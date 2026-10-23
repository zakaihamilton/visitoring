import { Tooltip } from "@/app/components/Tooltip";
import styles from "../dashboard.module.css";
import { formatNumber } from "./types";

export function BreakdownList({
  title,
  rows,
  empty = "No activity yet",
  showLabelTooltips = true,
  denominator,
  measure,
  limit = 8,
  help,
}: {
  title: string;
  rows: Array<{ label: string; count: number }>;
  empty?: string;
  showLabelTooltips?: boolean;
  denominator: number;
  measure: string;
  limit?: number;
  help?: string;
}) {
  return (
    <section className={styles.card}>
      <div className={styles.cardTitle}>
        <div>
          <h2>{title}</h2>
          <p>
            {measure} · Top {limit}
          </p>
        </div>
        {help ? <Tooltip label={title} content={help} /> : null}
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
                <b>
                  {formatNumber(row.count)}{" "}
                  <small>
                    ·{" "}
                    {denominator
                      ? new Intl.NumberFormat("en", { maximumFractionDigits: 1 }).format(
                          (row.count / denominator) * 100,
                        )
                      : 0}
                    %
                  </small>
                </b>
              </div>
              <div className={styles.track}>
                <span style={{ width: `${denominator ? (row.count / denominator) * 100 : 0}%` }} />
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
