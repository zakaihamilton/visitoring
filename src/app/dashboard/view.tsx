import type { getAnalyticsData } from "@/lib/analytics";
import styles from "./dashboard.module.css";

type Data = Awaited<ReturnType<typeof getAnalyticsData>>;
type Props = {
  sites: Array<{ id: string; name: string }>;
  siteId: string;
  data: Data;
  filters: Record<string, string>;
};

function number(value: number): string {
  return new Intl.NumberFormat("en").format(value);
}

function BreakdownList({
  title,
  rows,
  empty = "No data yet",
}: {
  title: string;
  rows: Array<{ label: string; count: number }>;
  empty?: string;
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
                <span title={row.label}>{row.label}</span>
                <b>{number(row.count)}</b>
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

function PropertyText({ properties }: { properties: Record<string, unknown> }) {
  const entries = Object.entries(properties);
  if (!entries.length) return <span className={styles.muted}>—</span>;
  return (
    <div className={styles.properties}>
      {entries.slice(0, 4).map(([key, value]) => (
        <span key={key}>
          <b>{key}</b>: {String(value)}
        </span>
      ))}
    </div>
  );
}

export function Dashboard({ sites, siteId, data, filters }: Props) {
  const maxTrend = Math.max(1, ...data.trend.map((day) => day.total));
  return (
    <main className={styles.main}>
      <div className={styles.heading}>
        <div>
          <div className="eyebrow">Workspace overview</div>
          <h1>Traffic, at a glance.</h1>
          <p>One clear view of how people find and use your site.</p>
        </div>
        <div className={styles.updated}>
          <span className={styles.liveDot} /> Live collection
        </div>
      </div>

      <form className={styles.filters} method="get">
        <label>
          Site
          <select name="site" defaultValue={siteId}>
            {sites.map((site) => (
              <option key={site.id} value={site.id}>
                {site.name}
              </option>
            ))}
          </select>
        </label>
        <label>
          From
          <input type="date" name="from" defaultValue={filters.from} />
        </label>
        <label>
          To
          <input type="date" name="to" defaultValue={filters.to} />
        </label>
        <label>
          Event
          <select name="event" defaultValue={filters.event}>
            <option value="">All events</option>
            {data.eventNames.map((name) => (
              <option key={name}>{name}</option>
            ))}
          </select>
        </label>
        <label>
          Path
          <input name="path" defaultValue={filters.path} placeholder="/pricing" />
        </label>
        <details className={styles.moreFilters}>
          <summary>More filters</summary>
          <div className={styles.moreGrid}>
            <label>
              Property key
              <input name="property" defaultValue={filters.property} placeholder="plan" />
            </label>
            <label>
              Property value
              <input
                name="propertyValue"
                defaultValue={filters.propertyValue}
                placeholder="starter"
              />
            </label>
            <label>
              Visitor ID
              <input name="visitor" defaultValue={filters.visitor} />
            </label>
            <label>
              Session ID
              <input name="session" defaultValue={filters.session} />
            </label>
          </div>
        </details>
        <button type="submit" className="button buttonPrimary">
          Apply filters
        </button>
      </form>

      <div className={styles.metrics}>
        <article className={styles.metric}>
          <span>Page views</span>
          <strong>{number(data.pageViews)}</strong>
          <small>including imported welcome views</small>
        </article>
        <article className={styles.metric}>
          <span>Visitors</span>
          <strong>{number(data.visitors)}</strong>
          <small>anonymous visitor IDs</small>
        </article>
        <article className={styles.metric}>
          <span>Sessions</span>
          <strong>{number(data.sessions)}</strong>
          <small>browser sessions</small>
        </article>
        <article className={styles.metric}>
          <span>Custom events</span>
          <strong>{number(data.customEvents)}</strong>
          <small>{number(data.total)} total events</small>
        </article>
      </div>

      <div className={styles.primaryGrid}>
        <section className={`${styles.card} ${styles.chartCard}`}>
          <div className={styles.cardTitle}>
            <div>
              <h2>Activity over time</h2>
              <p>Events and page views per day, UTC</p>
            </div>
            <span>Last {data.trend.length} days</span>
          </div>
          {data.total ? (
            <div className={styles.chart} role="img" aria-label="Daily event volume bar chart">
              {data.trend.map((day) => (
                <div
                  className={styles.barColumn}
                  key={day.day}
                  title={`${day.day}: ${day.total} events, ${day.pageViews} page views`}
                >
                  <div
                    className={styles.bar}
                    style={{
                      height: `${Math.max(day.total ? 5 : 0, (day.total / maxTrend) * 100)}%`,
                    }}
                  >
                    <span
                      style={{ height: `${day.total ? (day.pageViews / day.total) * 100 : 0}%` }}
                    />
                  </div>
                </div>
              ))}
            </div>
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
              <i className={styles.legendPage} /> Page views: {number(data.pageViews)}
            </span>
          </div>
        </section>
        <BreakdownList title="Popular pages" rows={data.pages} />
        <BreakdownList title="Referrers" rows={data.referrers} />
      </div>

      <div className={styles.breakdownGrid}>
        <BreakdownList title="Devices" rows={data.devices} />
        <BreakdownList title="Browsers" rows={data.browsers} />
        <BreakdownList title="Operating systems" rows={data.systems} />
        <BreakdownList title="Countries" rows={data.countries} />
        <BreakdownList title="Regions" rows={data.regions} />
      </div>

      <section className={`${styles.card} ${styles.eventCard}`}>
        <div className={styles.cardTitle}>
          <div>
            <h2>Recent events</h2>
            <p>Event properties are kept alongside the event.</p>
          </div>
          <span>{number(data.total)} matching</span>
        </div>
        {data.events.length ? (
          <div className={styles.tableWrap}>
            <table>
              <thead>
                <tr>
                  <th>Event</th>
                  <th>Page</th>
                  <th>Properties</th>
                  <th>Visitor</th>
                  <th>Time</th>
                </tr>
              </thead>
              <tbody>
                {data.events.map((event) => (
                  <tr key={event.id}>
                    <td>
                      <span className={styles.eventPill}>{event.eventName}</span>
                    </td>
                    <td className={styles.pathCell}>{event.path}</td>
                    <td>
                      <PropertyText properties={event.properties} />
                    </td>
                    <td>
                      <code>{event.visitorId.slice(0, 12)}…</code>
                    </td>
                    <td className={styles.timeCell}>
                      {new Date(event.createdAt).toISOString().replace("T", " ").slice(0, 16)} UTC
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <div className={styles.tableEmpty}>No events match these filters.</div>
        )}
      </section>

      <footer className={styles.footer}>
        <span>
          Visitoring stores coarse device and location categories. IP addresses and full user-agent
          strings are never retained.
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
