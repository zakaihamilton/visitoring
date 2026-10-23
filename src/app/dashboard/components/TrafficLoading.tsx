import { Skeleton, LoadingStatus, TopbarSkeleton } from "@/app/components/Skeleton";
import styles from "../dashboard.module.css";
import loading from "./traffic-loading.module.css";

type View = "overview" | "events" | "chart-data";
const titles = {
  overview: "Traffic, at a glance.",
  events: "Recent events",
  "chart-data": "Chart data",
};
const rows = ["first", "second", "third", "fourth", "fifth", "sixth"];

function LoadingFilters() {
  return (
    <>
      <div className={loading.shortcuts}>
        {["today", "week", "month", "reset"].map((item) => (
          <Skeleton key={item} width={item === "today" ? 62 : 100} height={36} />
        ))}
      </div>
      <div className={loading.mobileFilter}>
        <Skeleton width={106} height={40} />
      </div>
      <div className={`${styles.filters} ${loading.filters}`}>
        {["Site", "Start date", "End date", "Event type", "Page path"].map((label) => (
          <div className={loading.field} key={label}>
            <span>{label}</span>
            <Skeleton height={40} />
          </div>
        ))}
        <Skeleton width={112} height={40} />
      </div>
    </>
  );
}

function BreakdownSkeleton({ title }: { title: string }) {
  return (
    <section className={styles.card}>
      <div className={styles.cardTitle}>
        <div>
          <h2>{title}</h2>
          <Skeleton width={110} />
        </div>
      </div>
      {rows.slice(0, 4).map((row, index) => (
        <div className={loading.breakdownRow} key={row}>
          <div>
            <Skeleton width={`${58 - index * 6}%`} />
            <Skeleton width={44} />
          </div>
          <Skeleton height={4} />
        </div>
      ))}
    </section>
  );
}

function TrendSkeleton() {
  return (
    <section className={`${styles.card} ${styles.trendCard}`}>
      <div className={styles.cardTitle}>
        <div>
          <h2>Traffic over time</h2>
          <Skeleton width={160} />
        </div>
        <div className={loading.field}>
          <Skeleton width={44} />
          <Skeleton width={164} height={40} />
        </div>
      </div>
      <div className={loading.legend}>
        <Skeleton width={138} />
        <Skeleton width={138} />
      </div>
      <div className={loading.plot}>
        <div className={loading.axis}>
          {rows.slice(0, 5).map((row) => (
            <Skeleton key={row} width={20} height={9} />
          ))}
        </div>
        <div className={loading.grid}>
          {rows.slice(0, 5).map((row) => (
            <span key={row} />
          ))}
        </div>
      </div>
      <div className={loading.ticks}>
        {["start", "middle", "end"].map((tick) => (
          <Skeleton key={tick} width={46} height={10} />
        ))}
      </div>
      <div className={styles.chartReadout}>
        {["current", "previous"].map((period) => (
          <div className={styles.readoutPeriod} key={period}>
            <Skeleton width={110} height={10} />
            <Skeleton width={72} height={24} />
            <Skeleton width={100} height={11} />
          </div>
        ))}
      </div>
      <div className={styles.chartFooter}>
        <Skeleton width={132} height={36} />
      </div>
    </section>
  );
}

function TableSkeleton({ events }: { events: boolean }) {
  const columns = events
    ? [
        { id: "event", label: "Event" },
        { id: "page", label: "Page" },
        { id: "details", label: "Details" },
        { id: "visitor", label: "Visitor" },
        { id: "time", label: "Time" },
      ]
    : [
        { id: "current-date", label: "Selected interval" },
        { id: "current-count", label: "Count" },
        { id: "previous-date", label: "Previous interval" },
        { id: "previous-count", label: "Count" },
      ];
  return (
    <section className={styles.card}>
      <div className={styles.cardTitle}>
        <div>
          <h2>{events ? "Latest activity" : "Interval comparison"}</h2>
          <Skeleton width={260} />
        </div>
      </div>
      {!events ? (
        <>
          <div className={loading.tableControls}>
            <div className={loading.field}>
              <span>Metric</span>
              <Skeleton width={164} height={40} />
            </div>
            <Skeleton width={120} height={40} />
          </div>
          <Skeleton className={loading.tableNote} width="68%" />
          <Skeleton className={loading.tableNote} width={110} height={14} />
        </>
      ) : null}
      <div className={events ? loading.desktopEvents : loading.dataTable}>
        <div className={events ? loading.eventRow : loading.dataRow}>
          {columns.map((column) => (
            <span key={column.id}>{column.label}</span>
          ))}
        </div>
        {rows.map((row) => (
          <div className={events ? loading.eventRow : loading.dataRow} key={row}>
            {columns.map((column, index) => (
              <Skeleton key={column.id} width={index % 2 ? "62%" : "80%"} />
            ))}
          </div>
        ))}
      </div>
      {events ? (
        <div className={loading.mobileEvents}>
          {rows.slice(0, 3).map((row) => (
            <div className={loading.eventCard} key={row}>
              <div>
                <Skeleton width={80} height={24} />
                <Skeleton width={120} height={11} />
              </div>
              <Skeleton width="60%" />
              <Skeleton width="85%" />
              <Skeleton width="48%" />
            </div>
          ))}
        </div>
      ) : null}
    </section>
  );
}

export function TrafficLoading({ view, showTopbar = false }: { view: View; showTopbar?: boolean }) {
  return (
    <>
      {showTopbar ? <TopbarSkeleton /> : null}
      <LoadingStatus>
        Loading {view === "overview" ? "traffic overview" : titles[view].toLowerCase()}…
      </LoadingStatus>
      <main
        className={styles.main}
        aria-busy="true"
        aria-label={`Loading ${view === "overview" ? "traffic overview" : titles[view].toLowerCase()}`}
      >
        <div aria-hidden="true">
          <div className={styles.heading}>
            <div className={loading.headingText}>
              <Skeleton width={180} height={16} />
              <h1>{titles[view]}</h1>
              <Skeleton width={270} height={18} />
            </div>
            <div className={`${styles.updated} ${styles.dataFreshness}`}>
              <Skeleton width={185} />
              <Skeleton width={40} height={40} round />
            </div>
          </div>
          <div className={`${styles.dashboardNavigation} ${loading.navigation}`}>
            {(["overview", "events", "chart-data"] as const).map((tab) => (
              <span key={tab} data-current={tab === view}>
                {tab === "overview" ? "Traffic overview" : titles[tab]}
              </span>
            ))}
          </div>
          <LoadingFilters />
          {view === "overview" ? (
            <>
              <div className={styles.metrics}>
                {["Visitors", "Page views", "Sessions", "Custom events"].map((metric) => (
                  <article className={styles.metric} key={metric}>
                    <div className={styles.metricLabel}>{metric}</div>
                    <Skeleton className={loading.value} width={66} height={34} />
                    <div className={loading.metricNote}>
                      <Skeleton width={80} height={12} />
                      <Skeleton width={92} height={12} />
                    </div>
                  </article>
                ))}
              </div>
              <Skeleton className={loading.comparison} width="72%" />
              <TrendSkeleton />
              <div className={styles.primaryGrid}>
                {["Popular pages", "Traffic sources"].map((title) => (
                  <BreakdownSkeleton key={title} title={title} />
                ))}
              </div>
              <Skeleton width={260} />
              <div className={`${styles.breakdownGrid} ${styles.compactAudience}`}>
                {["Devices", "Browsers", "Operating systems"].map((title) => (
                  <BreakdownSkeleton key={title} title={title} />
                ))}
              </div>
            </>
          ) : (
            <TableSkeleton events={view === "events"} />
          )}
        </div>
      </main>
    </>
  );
}
