import type { Metadata } from "next";
import Link from "next/link";
import { PublicHeader } from "@/app/components/PublicHeader";
import styles from "./developers.module.css";

export const metadata: Metadata = {
  title: "Developers — Visitoring",
  description: "Add Visitoring analytics to your website in a few simple steps.",
  openGraph: {
    type: "website",
    siteName: "Visitoring",
    url: "/developers",
    title: "Developers — Visitoring",
    description: "Add Visitoring analytics to your website in a few simple steps.",
    images: [
      {
        url: "/og-image.png",
        width: 1200,
        height: 630,
        alt: "Visitoring — know your traffic, keep it simple.",
      },
    ],
  },
  twitter: {
    card: "summary_large_image",
    title: "Developers — Visitoring",
    description: "Add Visitoring analytics to your website in a few simple steps.",
    images: ["/og-image.png"],
  },
};

const trackerSnippet =
  '<script defer src="https://visitoring.vercel.app/tracker.js" data-site-key="vk_YOUR_SITE_KEY"></script>';
const eventSnippet = `function onSignupSuccess() {
  window.Visitoring.track("signup", {
    plan: "starter"
  });
}`;

export default function DevelopersPage() {
  return (
    <main className={styles.page}>
      <div className={styles.shell}>
        <PublicHeader page="developers" />

        <section className={styles.intro} aria-labelledby="developers-title">
          <div className={styles.eyebrow}>For developers</div>
          <h1 id="developers-title">Add Visitoring to your site.</h1>
          <p>
            Add one small script to start seeing page views. Track signups and other important
            actions with a single line of JavaScript.
          </p>
        </section>

        <div className={styles.content}>
          <aside className={styles.toc} aria-label="On this page">
            <a href="#setup">Get started</a>
            <a href="#events">Track actions</a>
            <a href="#privacy">Privacy and behavior</a>
          </aside>

          <div className={styles.article}>
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
                  <strong>Sign in and add a site.</strong> An administrator can open <b>Sites</b>
                  and create a site for each website you want to measure.
                </li>
                <li>
                  <strong>Add the website addresses.</strong> Enter each address that should send
                  data, such as <code>example.com</code> and <code>www.example.com</code>. Include
                  each one; Visitoring checks the exact address.
                </li>
                <li>
                  <strong>Copy the tracking key.</strong> It appears only when the site is created
                  or the key is replaced, so save it before leaving the page.
                </li>
              </ol>
            </section>

            <section className={styles.section}>
              <div className={styles.sectionHeading}>
                <span>02</span>
                <div>
                  <h2>Add the tracker</h2>
                  <p>Place this snippet on the pages you want to measure.</p>
                </div>
              </div>
              <pre className={styles.codeBlock}>
                <code>{trackerSnippet}</code>
              </pre>
              <p className={styles.note}>
                Replace <code>vk_YOUR_SITE_KEY</code> with your tracking key. If Visitoring has a
                custom address, replace <code>visitoring.vercel.app</code> too.
              </p>
              <p className={styles.note}>
                The tracker records a page view when a page opens and when a web app changes pages
                without reloading, including back and forward navigation.
              </p>
            </section>

            <section id="events" className={styles.section}>
              <div className={styles.sectionHeading}>
                <span>03</span>
                <div>
                  <h2>Track an action</h2>
                  <p>Send a custom event when someone completes an important action.</p>
                </div>
              </div>
              <pre className={styles.codeBlock}>
                <code>{eventSnippet}</code>
              </pre>
              <p className={styles.note}>
                Use this as your signup-success handler and call it only after your app confirms the
                signup. The tracker uses <code>defer</code>, so it is available for normal user
                actions after page parsing finishes. Choose your own event name and details to
                compare activity later.
              </p>
            </section>

            <section id="privacy" className={`${styles.section} ${styles.privacy}`}>
              <div className={styles.sectionHeading}>
                <span>04</span>
                <div>
                  <h2>Privacy and behavior</h2>
                  <p>Visitoring keeps collection small and predictable.</p>
                </div>
              </div>
              <ul className={styles.privacyList}>
                <li>Do Not Track is respected.</li>
                <li>Only the page path is sent; query strings and page fragments are left out.</li>
                <li>
                  The website that brought someone is shown by name only, not its full address.
                </li>
                <li>IP addresses and full browser details are not stored.</li>
              </ul>
              <p className={styles.note}>
                Moving from Sentry8? Visitoring accepts its existing <code>welcome_*</code> events.
                Keep only one automatic page-view tracker active when you switch.
              </p>
            </section>

            <div className={styles.footerCallout}>
              <p>Need a tracking key? Sign in and ask your project administrator to add a site.</p>
              <Link href="/login" className="button buttonPrimary">
                Log in <span aria-hidden>↗</span>
              </Link>
            </div>
          </div>
        </div>
      </div>
    </main>
  );
}
