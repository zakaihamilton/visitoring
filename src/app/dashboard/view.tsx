import Link from "next/link";
import styles from "./dashboard.module.css";
import { ActivityChart } from "./components/ActivityChart";
import { BreakdownList } from "./components/BreakdownList";
import { DashboardFiltersForm } from "./components/DashboardFilters";
import { DashboardMetrics } from "./components/DashboardMetrics";
import { RecentEventsTable } from "./components/RecentEventsTable";
import type { DashboardProps } from "./components/types";

export function Dashboard({ sites, siteId, data, filters }: DashboardProps) {
  const currentSite = sites.find((s) => s.id === siteId);

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

      {data.total === 0 ? (
        <section className={styles.setupGuideCard} aria-label="Tracking setup guide">
          <div className={styles.setupGuideHeader}>
            <div className={styles.setupGuideHeading}>
              <div className="eyebrow">Awaiting first events</div>
              <h2>Ready to start tracking {currentSite?.name ?? "your site"}?</h2>
              <p>Add the tracking snippet below to your website&apos;s HTML &lt;head&gt; tag to start collecting real-time privacy-friendly analytics.</p>
            </div>
            <div className={styles.setupActions}>
              <Link href="/settings/setup" className="button buttonPrimary">
                Full setup instructions
              </Link>
              <Link href="/settings/sites" className="button buttonQuiet">
                Site settings
              </Link>
            </div>
          </div>
          <div className={styles.setupSnippetBox}>
            <code className={styles.setupSnippetCode}>
              {`<script defer src="https://visitoring.vercel.app/tracker.js" data-site-key="YOUR_SITE_KEY"></script>`}
            </code>
          </div>
        </section>
      ) : null}

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
