import styles from "../dashboard.module.css";
import tableStyles from "./RecentEventsTable.module.css";
import { formatNumber, type RecentEventsData } from "./types";

export function PropertyText({ properties }: { properties: Record<string, unknown> }) {
  const entries = Object.entries(properties);
  if (!entries.length) return <span className={tableStyles.muted}>—</span>;

  return (
    <div className={tableStyles.properties}>
      {entries.slice(0, 4).map(([key, value]) => (
        <span key={key}>
          <b>{key}</b>: {formatPropertyValue(value)}
        </span>
      ))}
      {entries.length > 4 ? (
        <span className={tableStyles.propertyMore}>+{entries.length - 4} more properties</span>
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

export function RecentEventsTable({ data }: { data: RecentEventsData }) {
  return (
    <section className={`${styles.card} ${tableStyles.eventCard}`} data-testid="recent-events">
      <div className={styles.cardTitle}>
        <div>
          <h2>Latest activity</h2>
          <p>
            {data.total
              ? `Records ${(data.page - 1) * data.pageSize + 1}–${Math.min(data.page * data.pageSize, data.total)} of ${formatNumber(data.total)} matching records.`
              : "No matching records."}{" "}
            Newest first.
          </p>
        </div>
        <span>{formatNumber(data.total)} matching</span>
      </div>
      {data.events.length ? (
        <>
          <section
            className={tableStyles.tableWrap}
            data-testid="desktop-events-table"
            // biome-ignore lint/a11y/noNoninteractiveTabindex: Scrollable content needs keyboard access.
            tabIndex={0}
            aria-label="Recent event details"
          >
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
                      <span className={tableStyles.eventPill}>{event.eventName}</span>
                    </td>
                    <td className={tableStyles.pathCell}>{event.path}</td>
                    <td>
                      <PropertyText properties={event.properties} />
                    </td>
                    <td>
                      <code title={event.visitorId}>{event.visitorId.slice(0, 12)}…</code>
                    </td>
                    <td className={tableStyles.timeCell}>
                      <EventTime createdAt={event.createdAt} />
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </section>
          <div className={tableStyles.mobileEvents} data-testid="mobile-event-cards">
            {data.events.map((event) => (
              <article className={tableStyles.mobileEvent} key={event.id}>
                <div className={tableStyles.mobileEventHeader}>
                  <span className={tableStyles.eventPill}>{event.eventName}</span>
                  <time className={tableStyles.timeCell} dateTime={event.createdAt}>
                    <EventTime createdAt={event.createdAt} />
                  </time>
                </div>
                <dl className={tableStyles.mobileEventDetails}>
                  <div>
                    <dt>Page</dt>
                    <dd className={tableStyles.pathCell}>{event.path}</dd>
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
                      <code className={tableStyles.mobileVisitorId}>{event.visitorId}</code>
                    </dd>
                  </div>
                </dl>
              </article>
            ))}
          </div>
        </>
      ) : (
        <div className={tableStyles.tableEmpty}>No events found. Try changing your filters.</div>
      )}
    </section>
  );
}
