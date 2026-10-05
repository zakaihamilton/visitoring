import { Tooltip } from "@/app/components/Tooltip";
import { Topbar } from "@/app/components/Topbar";
import { requireAdmin } from "@/lib/auth";
import { SettingsNavigation } from "../SettingsNavigation";
import styles from "../settings-page.module.css";

export const dynamic = "force-dynamic";

const trackerSnippet =
  '<script defer src="https://visitoring.vercel.app/tracker.js" data-site-key="vk_YOUR_SITE_KEY"></script>';

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
            <p>
              Install the tracker to start collecting page views, then add custom events if you need
              them.
            </p>
          </div>
        </div>

        <div className={styles.setupGrid}>
          <section className={styles.setupCard} aria-labelledby="install-tracker-title">
            <div className={styles.sectionHeading}>
              <h2 id="install-tracker-title">1. Install the tracker</h2>
              <Tooltip
                label="Install the tracker"
                content="The tracker records page views and sends them to the site associated with this key."
              />
            </div>
            <p>
              Add this script to each page you want to measure. Replace the sample key with the full
              key shown when you add a site or replace its key.
            </p>
            <pre>
              <code>{trackerSnippet}</code>
            </pre>
            <div className={styles.notice}>
              <Tooltip
                label="Tracking key"
                content="For security, the full key is shown only once after creation or replacement. Copy it before leaving that confirmation."
              />
              <p>
                Your full tracking key is shown only once. Change the script address if you use a
                custom Visitoring domain.
              </p>
            </div>
          </section>

          <section className={styles.setupCard} aria-labelledby="custom-events-title">
            <div className={styles.sectionHeading}>
              <h2 id="custom-events-title">2. Record a custom event</h2>
              <Tooltip
                label="Custom event"
                content="Custom events measure actions such as signups or purchases in addition to automatic page views."
              />
            </div>
            <p>
              Call this from your app’s success handler after the action completes. Only send an
              event once it has actually happened.
            </p>
            <pre>
              <code>{'window.Visitoring.track("signup", { plan: "starter" })'}</code>
            </pre>
            <p>
              The event name appears in the dashboard’s Event type filter. Add small details such as
              a plan name when they help explain the action.
            </p>
          </section>
        </div>
      </main>
    </>
  );
}
