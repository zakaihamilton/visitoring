import { Topbar } from "@/app/components/Topbar";
import { requireAdmin } from "@/lib/auth";
import { TrackerSection } from "../../developers/components/TrackerSection";
import { SettingsNavigation } from "../SettingsNavigation";
import { SettingsPageIntro } from "../SettingsPageIntro";
import styles from "../settings-page.module.css";

export const dynamic = "force-dynamic";

export default async function SettingsSetupPage() {
  const user = await requireAdmin();
  return (
    <>
      <Topbar user={user} section="settings" />
      <SettingsNavigation active="setup" />
      <main className={styles.page}>
        <SettingsPageIntro
          eyebrow="Settings · Setup"
          title="Connect your website"
          description="Choose the integration that matches your website."
        />

        <TrackerSection numbered={false} />
      </main>
    </>
  );
}
