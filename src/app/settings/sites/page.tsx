import { desc, eq } from "drizzle-orm";
import { Suspense } from "react";
import { VisitoringDashboardFrame } from "@/app/components/VisitoringDashboardFrame";
import { db } from "@/db";
import { sites } from "@/db/schema";
import { requireAdmin } from "@/lib/auth";
import { SiteCardsSkeleton } from "../SettingsLoading";
import { SettingsPageIntro } from "../SettingsPageIntro";
import styles from "../settings-page.module.css";
import { CreateSiteForm } from "./components/CreateSiteForm";
import { SiteListView } from "./SiteListView";

export const dynamic = "force-dynamic";

async function SiteList({ projectId }: { projectId: string }) {
  const projectSites = await db
    .select({
      id: sites.id,
      name: sites.name,
      allowedDomains: sites.allowedDomains,
      siteKey: sites.siteKey,
      siteKeyPrefix: sites.siteKeyPrefix,
    })
    .from(sites)
    .where(eq(sites.projectId, projectId))
    .orderBy(desc(sites.createdAt));

  return <SiteListView projectSites={projectSites} />;
}

export default async function SettingsSitesPage() {
  const user = await requireAdmin();

  return (
    <VisitoringDashboardFrame user={user} active="sites" title="Sites and tracking">
      <main className={styles.page}>
        <SettingsPageIntro
          eyebrow="Settings · Sites"
          title="Manage your sites"
          description="Add each website you track. Approved addresses and tracking keys are managed here."
        />

        <section className={styles.card} aria-labelledby="add-site-title">
          <div className={styles.cardHeading}>
            <h2 id="add-site-title">Add a site</h2>
            <span className={styles.hint}>A site can be a website or web app.</span>
          </div>
          <CreateSiteForm />
        </section>

        <Suspense fallback={<SiteCardsSkeleton />}>
          <SiteList projectId={user.projectId} />
        </Suspense>
      </main>
    </VisitoringDashboardFrame>
  );
}
