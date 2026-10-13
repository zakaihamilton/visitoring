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
const reactRootSnippet = `import { VisitoringProvider } from "@visitoring/react";
import { createRoot } from "react-dom/client";
import App from "./App";

createRoot(document.getElementById("root")!).render(
  <VisitoringProvider siteKey="vk_YOUR_SITE_KEY">
    <App />
  </VisitoringProvider>
);`;
const nextRootSnippet = `import type { ReactNode } from "react";
import { VisitoringProvider } from "@visitoring/react";

export default function RootLayout({ children }: Readonly<{ children: ReactNode }>) {
  return (
    <html lang="en">
      <body>
        <VisitoringProvider
          siteKey={process.env.NEXT_PUBLIC_VISITORING_SITE_KEY ?? ""}
        >
          {children}
        </VisitoringProvider>
      </body>
    </html>
  );
}`;
const reactEventSnippet = `"use client";

import { useVisitoring } from "@visitoring/react";

export function SignupButton() {
  const { track } = useVisitoring();
  async function onSignup() {
    const result = await completeSignup();
    if (result.ok) track("signup", { plan: "starter" });
  }
  return <button type="button" onClick={onSignup}>Sign up</button>;
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
          <p>
            For a non-React site, place this snippet on the pages you want to measure. For a React
            app, use the provider below instead; do not install both integrations.
          </p>
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
      <div className={`${styles.sectionHeading} ${styles.reactPackageHeading}`}>
        <span>R</span>
        <div>
          <h2>Use the React package</h2>
          <p>Install the typed provider once around your app.</p>
        </div>
      </div>
      <pre className={styles.codeBlock}>
        <code>npm install @visitoring/react</code>
      </pre>
      <p className={styles.note}>
        For Vite or React Router, put the provider above your app/router:
      </p>
      <pre className={styles.codeBlock}>
        <code>{reactRootSnippet}</code>
      </pre>
      <p className={styles.note}>
        For Next.js App Router, put the provider in the root layout and set
        <code> NEXT_PUBLIC_VISITORING_SITE_KEY</code> in the environment:
      </p>
      <pre className={styles.codeBlock}>
        <code>{nextRootSnippet}</code>
      </pre>
      <p className={styles.note}>Use the hook from a client component after an action succeeds:</p>
      <pre className={styles.codeBlock}>
        <code>{reactEventSnippet}</code>
      </pre>
      <p className={styles.note}>
        The provider queues events while the tracker loads. SPA page views are automatic; do not add
        another route-change page-view effect. Visitoring records the pathname and omits query
        strings and fragments.
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
        parsing finishes. Choose your own event name and details to compare activity later. Avoid
        names, email addresses, account IDs, or other personal data. Use broad values such as plan
        type.
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
