import Link from "next/link";
import { Tooltip } from "@/app/components/Tooltip";
import styles from "../developers.module.css";

const trackerSnippet =
  '<script defer src="https://visitoring.vercel.app/tracker.js" data-site-key="vk_YOUR_SITE_KEY"></script>';
const eventSnippet = `function onSignupSuccess() {
  window.Visitoring.track("signup", {
    plan: "starter"
  });
}`;

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
          <strong>Sign in and add a site.</strong> An administrator can open{" "}
          <b>Settings → Sites</b> and create a site for each website you want to measure.
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
          <strong>Copy the tracking key.</strong> It appears only when the site is created or the
          key is replaced, so save it before leaving the page.{" "}
          <Tooltip
            label="Tracking key"
            content="Visitoring stores a hash of the key, so the full value cannot be shown again later."
          />
        </li>
      </ol>
    </section>
  );
}

export function TrackerSection() {
  return (
    <section id="tracker" className={styles.section}>
      <div className={styles.sectionHeading}>
        <span>02</span>
        <div>
          <div className={styles.sectionTitleRow}>
            <h2>Add the tracker</h2>
            <Tooltip
              label="Tracker script"
              content="The deferred script records page views and exposes the custom event API after it loads."
            />
          </div>
          <p>Place this snippet on the pages you want to measure.</p>
        </div>
      </div>
      <pre className={styles.codeBlock}>
        <code>{trackerSnippet}</code>
      </pre>
      <p className={styles.note}>
        Replace <code>vk_YOUR_SITE_KEY</code> with your tracking key. If Visitoring has a custom
        address, replace <code>visitoring.vercel.app</code> too.
      </p>
      <p className={styles.note}>
        The tracker records a page view when a page opens and when a web app changes pages without
        reloading, including back and forward navigation.
      </p>
    </section>
  );
}

export function CustomEventsSection() {
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
      <pre className={styles.codeBlock}>
        <code>{eventSnippet}</code>
      </pre>
      <p className={styles.note}>
        Use this as your signup-success handler and call it only after your app confirms the signup.
        The tracker uses <code>defer</code>, so it is available for normal user actions after page
        parsing finishes. Choose your own event name and details to compare activity later.
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
