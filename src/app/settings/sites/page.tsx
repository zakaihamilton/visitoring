import { Suspense } from "react";
import { desc, eq } from "drizzle-orm";
import { db } from "@/db";
import { sites } from "@/db/schema";
import { Topbar } from "@/app/components/Topbar";
import { requireAdmin } from "@/lib/auth";
import { SettingsNavigation } from "../SettingsNavigation";
import { CreateSiteForm } from "./components/CreateSiteForm";
import { SiteKeyDisplay } from "./components/SiteKeyDisplay";
import { SiteControls } from "./components/SiteControls";
import styles from "../settings-page.module.css";

export const dynamic = "force-dynamic";
const siteSkeletons = ["first", "second"];

async function SiteList({ workspaceId }: { workspaceId: string }) {
  const workspaceSites = await db
    .select({
      id: sites.id,
      name: sites.name,
      allowedDomains: sites.allowedDomains,
      siteKey: sites.siteKey,
      siteKeyPrefix: sites.siteKeyPrefix,
    })
    .from(sites)
    .where(eq(sites.workspaceId, workspaceId))
    .orderBy(desc(sites.createdAt));

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

function SiteListLoading() {
  return (
    <div className={styles.siteList} aria-busy="true">
      <p className={styles.hint}>Loading sites…</p>
      {siteSkeletons.map((site) => (
        <section className={styles.loadingSiteCard} aria-hidden="true" key={site}>
          <span className={styles.loadingSiteTitle} />
          <span className={styles.loadingSiteLine} />
          <span className={styles.loadingSiteLine} />
        </section>
      ))}
    </div>
  );
}

export default async function SettingsSitesPage() {
  const user = await requireAdmin();

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

        <Suspense fallback={<SiteListLoading />}>
          <SiteList workspaceId={user.workspaceId} />
        </Suspense>
      </main>
    </>
  );
}
