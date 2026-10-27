import { desc, eq } from "drizzle-orm";
import { Suspense } from "react";
import { Topbar } from "@/app/components/Topbar";
import { db } from "@/db";
import { sites } from "@/db/schema";
import { requireAdmin } from "@/lib/auth";
import { SiteCardsSkeleton } from "../SettingsLoading";
import { SettingsNavigation } from "../SettingsNavigation";
import styles from "../settings-page.module.css";
import { CreateSiteForm } from "./components/CreateSiteForm";
import { SiteListView } from "./SiteListView";

export const dynamic = "force-dynamic";

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

  return <SiteListView workspaceSites={workspaceSites} />;
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

        <Suspense fallback={<SiteCardsSkeleton />}>
          <SiteList workspaceId={user.workspaceId} />
        </Suspense>
      </main>
    </>
  );
}
