import { DataFreshness } from "./components/DataFreshness";
/* eslint-disable jsx-a11y/no-noninteractive-tabindex -- Scrollable regions need keyboard access. */
import Link from "next/link";
import { chartMetric } from "./components/chart-data";
import { dateLabel } from "@/lib/analytics-period";
import { TrafficFilterSummary } from "./components/TrafficFilterSummary";
import styles from "./dashboard.module.css";
import { ActivityChart } from "./components/ActivityChart";
import { BreakdownList } from "./components/BreakdownList";
import { DashboardFiltersForm } from "./components/DashboardFilters";
import { DashboardMetrics } from "./components/DashboardMetrics";
import { DashboardNavigation } from "./components/DashboardNavigation";
import type { DashboardProps } from "./components/types";

export function Dashboard({ sites, siteId, data, filters }: DashboardProps) {
  const hasLocation = [...data.countries, ...data.regions].some((row) => row.label !== "Unknown");
  const currentSite = sites.find((s) => s.id === siteId);

  return (
    <main className={styles.main}>
      <div className={styles.heading}>
        <div>
          <div className="eyebrow">{currentSite?.name ?? "Site overview"}</div>
          <h1>Traffic, at a glance.</h1>
          <p>
            {dateLabel(`${filters.from}T00:00:00Z`, false, true)} –{" "}
            {dateLabel(`${filters.to}T00:00:00Z`, false, true)} · UTC
            {data.period.partial ? " · Today is partial" : ""}
          </p>
        </div>
        <DataFreshness retrievedAt={data.retrievedAt} />
      </div>

      <DashboardNavigation siteId={siteId} filters={filters} current="overview" />
      {!data.hasSiteActivity ? (
        <section className={styles.setupGuideCard} aria-label="Tracking setup guide">
          <div className={styles.setupGuideHeader}>
            <div className={styles.setupGuideHeading}>
              <div className="eyebrow">Awaiting first events</div>
              <h2>Ready to start tracking {currentSite?.name ?? "your site"}?</h2>
              <p>
                Add the tracking snippet below to your website&apos;s HTML &lt;head&gt; tag to start
                collecting real-time privacy-friendly analytics.
              </p>
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
          {/* biome-ignore lint/a11y/noNoninteractiveTabindex: Scrollable content needs keyboard access. */}
          <section className={styles.setupSnippetBox} tabIndex={0} aria-label="Tracking snippet">
            <code className={styles.setupSnippetCode}>
              {`<script defer src="https://visitoring.vercel.app/tracker.js" data-site-key="YOUR_SITE_KEY"></script>`}
            </code>
          </section>
        </section>
      ) : null}

      <TrafficFilterSummary siteId={siteId} filters={filters} retrievedAt={data.retrievedAt} />
      <DashboardFiltersForm
        key={`${siteId}:${JSON.stringify(filters)}`}
        sites={sites}
        siteId={siteId}
        data={data}
        filters={filters}
      />
      {data.hasSiteActivity && data.total === 0 ? (
        <div className={styles.setupGuideCard}>
          <h2>No activity matches these filters</h2>
          <p>Try a wider date range or reset your filters to see recent traffic.</p>
          <Link href={`/dashboard?site=${encodeURIComponent(siteId)}`}>Reset filters</Link>
        </div>
      ) : null}
      <DashboardMetrics data={data} />
      <ActivityChart
        key={`${siteId}:${filters.metric ?? "visitors"}`}
        siteId={siteId}
        filters={filters}
        initialMetric={chartMetric(filters.metric)}
        data={{
          trend: data.trend,
          period: data.period,
          total: data.total,
          previous: data.previous,
        }}
      />

      <div className={styles.primaryGrid}>
        <BreakdownList
          title="Popular pages"
          rows={data.pages}
          denominator={data.breakdownTotal}
          measure={data.breakdownMeasure}
          limit={6}
        />
        <BreakdownList
          title="Traffic sources"
          rows={data.referrers}
          denominator={data.breakdownTotal}
          measure={data.breakdownMeasure}
          limit={6}
          help="Direct means no referring website was recorded. This can include bookmarks, typed addresses, or links that omit referral details."
        />
      </div>

      <p className={styles.comparisonNote}>
        Audience · Shares of matching events. Unknown means this detail was unavailable.
      </p>
      <div className={`${styles.breakdownGrid} ${!hasLocation ? styles.compactAudience : ""}`}>
        <BreakdownList
          title="Devices"
          rows={data.devices}
          showLabelTooltips={false}
          denominator={data.total}
          measure="Matching events"
        />
        <BreakdownList
          title="Browsers"
          rows={data.browsers}
          showLabelTooltips={false}
          denominator={data.total}
          measure="Matching events"
        />
        <BreakdownList
          title="Operating systems"
          rows={data.systems}
          showLabelTooltips={false}
          denominator={data.total}
          measure="Matching events"
        />
        {hasLocation ? (
          <>
            <BreakdownList
              title="Countries"
              rows={data.countries}
              showLabelTooltips={false}
              denominator={data.total}
              measure="Matching events"
            />
            <BreakdownList
              title="Regions"
              rows={data.regions}
              showLabelTooltips={false}
              denominator={data.total}
              measure="Matching events"
            />
          </>
        ) : null}
      </div>
      {!hasLocation && data.total > 0 ? (
        <p className={styles.comparisonNote}>Location details are unavailable for these events.</p>
      ) : null}
    </main>
  );
}
