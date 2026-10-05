import { desc, eq } from "drizzle-orm";
import { db } from "@/db";
import { sites } from "@/db/schema";
import { Topbar } from "@/app/components/Topbar";
import { Tooltip } from "@/app/components/Tooltip";
import { requireAdmin } from "@/lib/auth";
import { SettingsNavigation } from "../SettingsNavigation";
import { CreateSiteForm, SiteControls } from "./SiteManager";
import styles from "../settings-page.module.css";

export const dynamic = "force-dynamic";

export default async function SettingsSitesPage() {
  const user = await requireAdmin();
  const workspaceSites = await db
    .select({
      id: sites.id,
      name: sites.name,
      allowedDomains: sites.allowedDomains,
      siteKeyPrefix: sites.siteKeyPrefix,
    })
    .from(sites)
    .where(eq(sites.workspaceId, user.workspaceId))
    .orderBy(desc(sites.createdAt));

  return (
    <>
      <Topbar user={user} section="settings" />
      <SettingsNavigation active="sites" />
      <main className={styles.page}>
        <div className={styles.intro}>
          <div>
            <div className={styles.eyebrow}>Settings · Sites</div>
            <h1>Manage your sites</h1>
            <p>
              Add each website you track. Approved addresses and tracking keys are managed here.
            </p>
          </div>
        </div>

        <section className={styles.card} aria-labelledby="add-site-title">
          <div className={styles.cardHeading}>
            <h2 id="add-site-title">Add a site</h2>
            <span className={styles.hint}>A site can be a website or web app.</span>
          </div>
          <CreateSiteForm />
        </section>

        <div className={styles.siteList}>
          {workspaceSites.length ? (
            workspaceSites.map((site) => (
              <section
                className={styles.siteCard}
                key={site.id}
                aria-labelledby={`site-${site.id}`}
              >
                <div className={styles.siteHeader}>
                  <div className={styles.siteHeading}>
                    <h2 id={`site-${site.id}`}>{site.name}</h2>
                  </div>
                  <div className={styles.keySummary}>
                    <span>Tracking key</span>
                    <code>{site.siteKeyPrefix}••••••</code>
                    <Tooltip
                      label="Tracking key"
                      content="The full key is shown only when it is created or replaced."
                    />
                  </div>
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
      </main>
    </>
  );
}
