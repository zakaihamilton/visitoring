import { desc, eq } from "drizzle-orm";
import { db } from "@/db";
import { sites } from "@/db/schema";
import { requireAdmin } from "@/lib/auth";
import { Topbar } from "@/app/components/Topbar";
import { CreateSiteForm, SiteControls } from "./SiteManager";
import styles from "./sites.module.css";

export const dynamic = "force-dynamic";

export default async function SitesPage() {
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
      <Topbar user={user} section="sites" />
      <main className={styles.page}>
        <div className={styles.intro}>
          <div>
            <div className={styles.eyebrow}>Workspace settings</div>
            <h1>Your sites</h1>
            <p>Each site has a public collection key and an origin allowlist.</p>
          </div>
        </div>
        <section className={styles.createCard}>
          <h2>Add a site</h2>
          <CreateSiteForm />
        </section>
        <div className={styles.siteList}>
          {workspaceSites.length ? (
            workspaceSites.map((site) => (
              <section className={styles.siteCard} key={site.id}>
                <div className={styles.siteHead}>
                  <h2>{site.name}</h2>
                  <code>{site.siteKeyPrefix}••••••</code>
                </div>
                <div className={styles.domainList}>
                  {site.allowedDomains.map((domain) => (
                    <span key={domain}>{domain}</span>
                  ))}
                </div>
                <SiteControls siteId={site.id} domains={site.allowedDomains} />
              </section>
            ))
          ) : (
            <div className={styles.empty}>No sites yet. Add one above to get a tracker key.</div>
          )}
        </div>
        <section className={styles.install}>
          <div className={styles.eyebrow}>Install your tracker</div>
          <p>
            Copy the one-time site key shown after site creation or key rotation into this snippet:
          </p>
          <pre>
            <code>
              {
                '<script defer src="https://YOUR-VISITORING-HOST/tracker.js" data-site-key="vk_YOUR_SITE_KEY"></script>'
              }
            </code>
          </pre>
          <p>
            Custom events are available as{" "}
            <code>{'window.Visitoring.track("signup", { plan: "starter" })'}</code>.
          </p>
        </section>
      </main>
    </>
  );
}
