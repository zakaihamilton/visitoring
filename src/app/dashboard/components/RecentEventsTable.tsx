import styles from "../dashboard.module.css";
import { formatNumber, type DashboardData } from "./types";

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

export function RecentEventsTable({ data }: { data: DashboardData }) {
  return (
    <section className={`${styles.card} ${styles.eventCard}`}>
      <div className={styles.cardTitle}>
        <div>
          <h2>Recent events</h2>
          <p>Extra details you sent with each event.</p>
        </div>
        <span>{formatNumber(data.total)} matching</span>
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
  );
}
