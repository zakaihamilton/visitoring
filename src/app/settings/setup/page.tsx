import { Topbar } from "@/app/components/Topbar";
import { requireAdmin } from "@/lib/auth";
import { TrackerSection } from "../../developers/components/TrackerSection";
import { SettingsNavigation } from "../SettingsNavigation";
import styles from "../settings-page.module.css";

export const dynamic = "force-dynamic";

export default async function SettingsSetupPage() {
  const user = await requireAdmin();
  return (
    <>
      <Topbar user={user} section="settings" />
      <SettingsNavigation active="setup" />
      <main className={styles.page}>
        <div className={styles.intro}>
          <div>
            <div className={styles.eyebrow}>Settings · Setup</div>
            <h1>Connect your website</h1>
            <p>Choose the integration that matches your website.</p>
          </div>
        </div>

        <TrackerSection numbered={false} />
      </main>
    </>
  );
}
