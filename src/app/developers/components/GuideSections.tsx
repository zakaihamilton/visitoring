import Link from "next/link";
import { Tooltip } from "@/app/components/Tooltip";
import { eventSnippet, reactEventSnippet } from "./tracker-snippets";
import styles from "../developers.module.css";

export function SiteSetupSection() {
  return (
    <section id="setup" className={styles.section}>
      <div className={styles.sectionHeading}>
        <span>01</span>
        <div>
          <h2>Set up your site</h2>
          <p>Each website has its own tracking key and approved website addresses.</p>
        </div>
      </div>
      <ol className={styles.steps}>
        <li>
          <strong>Sign in and add a site.</strong> An administrator can open <b>Settings → Sites</b>{" "}
          and create a site for each website you want to measure.
        </li>
        <li>
          <strong>Add the website addresses.</strong> Enter each address that should send data, such
          as <code>example.com</code> and <code>www.example.com</code>. Include each one; Visitoring
          checks the exact address.{" "}
          <Tooltip
            label="Approved website addresses"
            content="Include every host that should send events, including www or a local development port when needed."
          />
        </li>
        <li>
          <strong>Copy the tracking key.</strong> View or copy it any time from Settings → Sites.{" "}
          <Tooltip
            label="Tracking key"
            content="Tracking keys are public browser identifiers. Existing keys created before the dashboard displayed values need to be replaced once."
          />
        </li>
      </ol>
    </section>
  );
}

export function CustomEventsSection({ integration }: { integration: "standard" | "react" }) {
  return (
    <section id="events" className={styles.section}>
      <div className={styles.sectionHeading}>
        <span>03</span>
        <div>
          <div className={styles.sectionTitleRow}>
            <h2>Track an action</h2>
            <Tooltip
              label="Custom event"
              content="Send a custom event after your app confirms an action such as a signup."
            />
          </div>
          <p>Send a custom event when someone completes an important action.</p>
        </div>
      </div>
      <p className={styles.note}>
        {integration === "react" ? "React app" : "Standard website"} example.{" "}
        {integration === "react"
          ? "Use the hook from a client component after an action succeeds."
          : "Call this after the action succeeds and the deferred tracker has finished loading."}
      </p>
      <pre className={styles.codeBlock}>
        <code>{integration === "react" ? reactEventSnippet : eventSnippet}</code>
      </pre>
      <p className={styles.note}>
        Choose your own event name and details. Avoid names, email addresses, account IDs, or other
        personal data in page paths or event properties; Visitoring does not automatically redact
        them. Use broad values such as plan type.
      </p>
    </section>
  );
}

export function PrivacySection() {
  return (
    <section id="privacy" className={`${styles.section} ${styles.privacy}`}>
      <div className={styles.sectionHeading}>
        <span>04</span>
        <div>
          <h2>Privacy and behavior</h2>
          <p>Visitoring keeps collection small and predictable.</p>
        </div>
      </div>
      <ul className={styles.privacyList}>
        <li>
          Do Not Track is respected.{" "}
          <Tooltip
            label="Do Not Track"
            content="When the browser sends the Do Not Track preference, Visitoring does not collect the event."
          />
        </li>
        <li>Only the page path is sent; query strings and page fragments are left out.</li>
        <li>
          Page path segments and custom event properties are stored as sent; do not put personal or
          sensitive data there.
        </li>
        <li>The website that brought someone is shown by name only, not its full address.</li>
        <li>IP addresses and full browser details are not stored.</li>
      </ul>
    </section>
  );
}

export function GuideFooterCallout() {
  return (
    <div className={styles.footerCallout}>
      <p>Need a tracking key? Sign in and ask your project administrator to add a site.</p>
      <Link href="/login" className="button buttonPrimary">
        Log in <span aria-hidden>↗</span>
      </Link>
    </div>
  );
}
