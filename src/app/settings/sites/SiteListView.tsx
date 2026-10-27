import styles from "../settings-page.module.css";
import { SiteControls } from "./components/SiteControls";
import { SiteKeyDisplay } from "./components/SiteKeyDisplay";

export function SiteListView({
  workspaceSites,
}: {
  workspaceSites: {
    id: string;
    name: string;
    allowedDomains: string[];
    siteKey: string | null;
    siteKeyPrefix: string;
  }[];
}) {
  return (
    <div className={styles.siteList}>
      {workspaceSites.length ? (
        workspaceSites.map((site) => (
          <section className={styles.siteCard} key={site.id} aria-labelledby={`site-${site.id}`}>
            <div className={styles.siteHeader}>
              <div className={styles.siteHeading}>
                <h2 id={`site-${site.id}`}>{site.name}</h2>
              </div>
              <SiteKeyDisplay siteKey={site.siteKey} siteKeyPrefix={site.siteKeyPrefix} />
            </div>
            <ul className={styles.domainList} aria-label="Approved website addresses">
              {site.allowedDomains.map((domain) => (
                <li key={domain}>{domain}</li>
              ))}
            </ul>
            <SiteControls siteId={site.id} domains={site.allowedDomains} />
          </section>
        ))
      ) : (
        <div className={styles.empty}>
          No sites yet. Add your first site above to create a tracking key.
        </div>
      )}
    </div>
  );
}
