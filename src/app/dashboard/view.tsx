import styles from "./dashboard.module.css";
import { ActivityChart } from "./components/ActivityChart";
import { BreakdownList } from "./components/BreakdownList";
import { DashboardFiltersForm } from "./components/DashboardFilters";
import { DashboardMetrics } from "./components/DashboardMetrics";
import { RecentEventsTable } from "./components/RecentEventsTable";
import type { DashboardProps } from "./components/types";

export function Dashboard({ sites, siteId, data, filters }: DashboardProps) {
  return (
    <main className={styles.main}>
      <div className={styles.heading}>
        <div>
          <div className="eyebrow">Workspace overview</div>
          <h1>Traffic, at a glance.</h1>
          <p>One clear view of how people find and use your site.</p>
        </div>
        <div className={styles.updated}>
          <span className={styles.liveDot} /> Tracking activity
        </div>
      </div>

      <DashboardFiltersForm sites={sites} siteId={siteId} data={data} filters={filters} />
      <DashboardMetrics data={data} />

      <div className={styles.primaryGrid}>
        <ActivityChart data={data} />
        <BreakdownList title="Popular pages" rows={data.pages} />
        <BreakdownList title="Traffic sources" rows={data.referrers} />
      </div>

      <div className={styles.breakdownGrid}>
        <BreakdownList title="Devices" rows={data.devices} showLabelTooltips={false} />
        <BreakdownList title="Browsers" rows={data.browsers} showLabelTooltips={false} />
        <BreakdownList title="Operating systems" rows={data.systems} showLabelTooltips={false} />
        <BreakdownList title="Countries" rows={data.countries} showLabelTooltips={false} />
        <BreakdownList title="Regions" rows={data.regions} showLabelTooltips={false} />
      </div>

      <RecentEventsTable data={data} />

      <footer className={styles.footer}>
        <span>
          Visitoring uses general device and location details. We never store your IP address or
          full browser details.
        </span>
        <span>
          IP geolocation by{" "}
          <a href="https://db-ip.com" target="_blank" rel="noreferrer">
            DB-IP
          </a>
        </span>
      </footer>
    </main>
  );
}
