import styles from "../dashboard.module.css";
import { formatNumber, type DashboardData } from "./types";

export function PropertyText({ properties }: { properties: Record<string, unknown> }) {
  const entries = Object.entries(properties);
  if (!entries.length) return <span className={styles.muted}>—</span>;

  return (
    <div className={styles.properties}>
      {entries.slice(0, 4).map(([key, value]) => (
        <span key={key}>
          <b>{key}</b>: {formatPropertyValue(value)}
        </span>
      ))}
      {entries.length > 4 ? (
        <span className={styles.propertyMore}>+{entries.length - 4} more properties</span>
      ) : null}
    </div>
  );
}

function formatPropertyValue(value: unknown): string {
  if (value === null) return "null";
  if (Array.isArray(value) || (typeof value === "object" && value !== null)) {
    return JSON.stringify(value) ?? String(value);
  }
  return String(value);
}

function EventTime({ createdAt }: { createdAt: string }) {
  return <>{new Date(createdAt).toISOString().replace("T", " ").slice(0, 16)} UTC</>;
}

export function RecentEventsTable({ data }: { data: DashboardData }) {
  return (
    <section className={`${styles.card} ${styles.eventCard}`} data-testid="recent-events">
      <div className={styles.cardTitle}>
        <div>
          <h2>Recent events</h2>
          <p>Extra details you sent with each event.</p>
        </div>
        <span>{formatNumber(data.total)} matching</span>
      </div>
      {data.events.length ? (
        <>
          <div className={styles.tableWrap} data-testid="desktop-events-table">
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
                      <code title={event.visitorId}>{event.visitorId.slice(0, 12)}…</code>
                    </td>
                    <td className={styles.timeCell}>
                      <EventTime createdAt={event.createdAt} />
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <div className={styles.mobileEvents} data-testid="mobile-event-cards">
            {data.events.map((event) => (
              <article className={styles.mobileEvent} key={event.id}>
                <div className={styles.mobileEventHeader}>
                  <span className={styles.eventPill}>{event.eventName}</span>
                  <time className={styles.timeCell} dateTime={event.createdAt}>
                    <EventTime createdAt={event.createdAt} />
                  </time>
                </div>
                <dl className={styles.mobileEventDetails}>
                  <div>
                    <dt>Page</dt>
                    <dd className={styles.pathCell}>{event.path}</dd>
                  </div>
                  <div>
                    <dt>Details</dt>
                    <dd>
                      <PropertyText properties={event.properties} />
                    </dd>
                  </div>
                  <div>
                    <dt>Visitor ID</dt>
                    <dd>
                      <code className={styles.mobileVisitorId}>{event.visitorId}</code>
                    </dd>
                  </div>
                </dl>
              </article>
            ))}
          </div>
        </>
      ) : (
        <div className={styles.tableEmpty}>No events found. Try changing your filters.</div>
      )}
    </section>
  );
}
