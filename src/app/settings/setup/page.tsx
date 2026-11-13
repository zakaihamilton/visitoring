import { VisitoringDashboardFrame } from "@/app/components/VisitoringDashboardFrame";
import { requireAdmin } from "@/lib/auth";
import { TrackerSection } from "../../developers/components/TrackerSection";
import { SettingsPageIntro } from "../SettingsPageIntro";
import styles from "../settings-page.module.css";

export const dynamic = "force-dynamic";

export default async function SettingsSetupPage() {
  const user = await requireAdmin();
  return (
    <VisitoringDashboardFrame user={user} active="setup" title="Installation guide">
      <main className={styles.page}>
        <SettingsPageIntro
          eyebrow="Settings · Setup"
          title="Connect your website"
          description="Choose the integration that matches your website."
        />

        <TrackerSection numbered={false} />
      </main>
    </VisitoringDashboardFrame>
  );
}
