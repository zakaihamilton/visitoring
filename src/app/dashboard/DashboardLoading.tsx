import styles from "./dashboard.module.css";

const metrics = ["Page views", "Visitors", "Sessions", "Custom events"];
const breakdowns = ["Devices", "Browsers", "Operating systems", "Countries", "Regions"];
const filterFields = ["site", "start", "end", "event", "path"];
const chartBars = Array.from({ length: 30 }, (_, index) => `bar-${index + 1}`);
const breakdownRows = ["row-1", "row-2", "row-3", "row-4", "row-5"];
const smallRows = ["row-1", "row-2", "row-3", "row-4"];
const recentEventRows = ["event-1", "event-2", "event-3", "event-4"];

function SkeletonLine({ className = "" }: { className?: string }) {
  return <span className={`${styles.skeletonLine} ${className}`} aria-hidden="true" />;
}

export function DashboardLoading() {
  return (
    <main className={styles.main} aria-busy="true" aria-label="Loading dashboard data">
      <div className={styles.heading}>
        <div>
          <div className="eyebrow">Workspace overview</div>
          <h1>Loading your dashboard…</h1>
          <p>Fetching your latest traffic and event data.</p>
        </div>
        <div className={styles.updated}>
          <span className={styles.liveDot} /> Loading activity
        </div>
      </div>

      <div className={`${styles.filters} ${styles.loadingFilters}`} aria-hidden="true">
        {filterFields.map((field) => (
          <SkeletonLine key={field} className={styles.skeletonField} />
        ))}
        <SkeletonLine className={styles.skeletonButton} />
      </div>

      <div className={styles.metrics} aria-hidden="true">
        {metrics.map((metric) => (
          <article className={styles.metric} key={metric}>
            <span className={styles.skeletonCaption}>{metric}</span>
            <SkeletonLine className={styles.skeletonValue} />
            <SkeletonLine className={styles.skeletonNote} />
          </article>
        ))}
      </div>

      <div className={styles.primaryGrid} aria-hidden="true">
        <section className={`${styles.card} ${styles.skeletonChartCard}`}>
          <SkeletonLine className={styles.skeletonTitle} />
          <div className={styles.skeletonBars}>
            {chartBars.map((bar) => (
              <span className={styles.skeletonBar} key={bar} />
            ))}
          </div>
        </section>
        {["pages", "referrers"].map((card) => (
          <section className={`${styles.card} ${styles.skeletonBreakdownCard}`} key={card}>
            <SkeletonLine className={styles.skeletonTitle} />
            {breakdownRows.map((row) => (
              <SkeletonLine className={styles.skeletonRow} key={row} />
            ))}
          </section>
        ))}
      </div>

      <div className={styles.breakdownGrid} aria-hidden="true">
        {breakdowns.map((title) => (
          <section className={`${styles.card} ${styles.skeletonSmallCard}`} key={title}>
            <span className={styles.skeletonCaption}>{title}</span>
            {smallRows.map((row) => (
              <SkeletonLine className={styles.skeletonRow} key={row} />
            ))}
          </section>
        ))}
      </div>

      <section className={`${styles.card} ${styles.skeletonEvents}`} aria-hidden="true">
        <SkeletonLine className={styles.skeletonTitle} />
        {recentEventRows.map((row) => (
          <SkeletonLine className={styles.skeletonEventRow} key={row} />
        ))}
      </section>
    </main>
  );
}
