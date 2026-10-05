import type { getAnalyticsData } from "@/lib/analytics";
import { Tooltip } from "@/app/components/Tooltip";
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

function FilterLabel({ label, htmlFor, help }: { label: string; htmlFor: string; help: string }) {
  return (
    <div className={styles.filterLabel}>
      <label htmlFor={htmlFor}>{label}</label>
      <Tooltip label={label} content={help} />
    </div>
  );
}

function BreakdownList({
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
          <div className="eyebrow">Project overview</div>
          <h1>Traffic, at a glance.</h1>
          <p>One clear view of how people find and use your site.</p>
        </div>
        <div className={styles.updated}>
          <span className={styles.liveDot} /> Tracking activity
        </div>
      </div>

      <form className={styles.filters} method="get">
        <div className={styles.filterField}>
          <FilterLabel
            label="Site"
            htmlFor="filter-site"
            help="Choose which website’s events to include in the dashboard."
          />
          <select id="filter-site" name="site" defaultValue={siteId}>
            {sites.map((site) => (
              <option key={site.id} value={site.id}>
                {site.name}
              </option>
            ))}
          </select>
        </div>
        <div className={styles.filterField}>
          <FilterLabel
            label="Start date"
            htmlFor="filter-from"
            help="Include events from the start of this date in UTC."
          />
          <input id="filter-from" type="date" name="from" defaultValue={filters.from} />
        </div>
        <div className={styles.filterField}>
          <FilterLabel
            label="End date"
            htmlFor="filter-to"
            help="Include events through the end of this date in UTC."
          />
          <input id="filter-to" type="date" name="to" defaultValue={filters.to} />
        </div>
        <div className={styles.filterField}>
          <FilterLabel
            label="Event type"
            htmlFor="filter-event"
            help="Enter an exact event name to filter results. Clear the field to include all event types."
          />
          <input
            id="filter-event"
            name="event"
            list="event-name-options"
            defaultValue={filters.event}
            maxLength={128}
            placeholder="All events"
          />
          <datalist id="event-name-options">
            {data.eventNames.map((name) => (
              <option key={name} value={name} />
            ))}
          </datalist>
        </div>
        <div className={styles.filterField}>
          <FilterLabel
            label="Page path"
            htmlFor="filter-path"
            help="Find page paths containing this text. Matching ignores letter case."
          />
          <input id="filter-path" name="path" defaultValue={filters.path} placeholder="/pricing" />
        </div>
        <details className={styles.moreFilters}>
          <summary>More options</summary>
          <p className={styles.moreHint}>
            Narrow results by event details or an exact visitor or session code.
          </p>
          <div className={styles.moreGrid}>
            <div className={styles.filterField}>
              <FilterLabel
                label="Event detail name"
                htmlFor="filter-property"
                help="Enter the exact detail name sent with an event, such as plan."
              />
              <input
                id="filter-property"
                name="property"
                defaultValue={filters.property}
                placeholder="plan"
              />
            </div>
            <div className={styles.filterField}>
              <FilterLabel
                label="Event detail value"
                htmlFor="filter-property-value"
                help="Enter part of the detail value to find matching events. This filter applies when an event detail name is also set."
              />
              <input
                id="filter-property-value"
                name="propertyValue"
                defaultValue={filters.propertyValue}
                placeholder="starter"
              />
            </div>
            <div className={styles.filterField}>
              <FilterLabel
                label="Visitor"
                htmlFor="filter-visitor"
                help="Match events from one exact anonymous visitor code."
              />
              <input
                id="filter-visitor"
                name="visitor"
                defaultValue={filters.visitor}
                placeholder="Paste visitor code"
              />
            </div>
            <div className={styles.filterField}>
              <FilterLabel
                label="Session"
                htmlFor="filter-session"
                help="Match events from one exact browser session code."
              />
              <input
                id="filter-session"
                name="session"
                defaultValue={filters.session}
                placeholder="Paste session code"
              />
            </div>
          </div>
        </details>
        <button type="submit" className="button buttonPrimary">
          Apply filters
        </button>
      </form>

      <div className={styles.metrics}>
        <article className={styles.metric}>
          <div className={styles.metricLabel}>
            <span>Page views</span>
            <Tooltip
              label="Page views"
              content="Includes page_view events and imported welcome_view events."
            />
          </div>
          <strong>{number(data.pageViews)}</strong>
          <small>Includes imported page views</small>
        </article>
        <article className={styles.metric}>
          <div className={styles.metricLabel}>
            <span>Visitors</span>
            <Tooltip
              label="Visitors"
              content="Count of distinct anonymous visitor codes in the selected results."
            />
          </div>
          <strong>{number(data.visitors)}</strong>
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
          <strong>{number(data.sessions)}</strong>
          <small>Visits within a browser session</small>
        </article>
        <article className={styles.metric}>
          <div className={styles.metricLabel}>
            <span>Custom events</span>
            <Tooltip
              label="Custom events"
              content="Events other than page_view and imported welcome_view, such as a signup."
            />
          </div>
          <strong>{number(data.customEvents)}</strong>
          <small>{number(data.total)} total, including page views</small>
        </article>
      </div>

      <div className={styles.primaryGrid}>
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
                    style={{
                      height: `${Math.max(day.total ? 5 : 0, (day.total / maxTrend) * 100)}%`,
                    }}
                  >
                    <span
                      style={{ height: `${day.total ? (day.pageViews / day.total) * 100 : 0}%` }}
                    />
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
              <i className={styles.legendPage} /> Page views: {number(data.pageViews)}
            </span>
          </div>
        </section>
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

      <section className={`${styles.card} ${styles.eventCard}`}>
        <div className={styles.cardTitle}>
          <div>
            <h2>Recent events</h2>
            <p>Extra details you sent with each event.</p>
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
                  <th>Details</th>
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
          <div className={styles.tableEmpty}>No events found. Try changing your filters.</div>
        )}
      </section>

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
