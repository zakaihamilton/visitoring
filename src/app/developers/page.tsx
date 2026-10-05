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

        <section className={styles.hero} aria-labelledby="developers-title">
          <div className={styles.heroCopy}>
            <div className={styles.eyebrow}>
              <span className={styles.eyebrowDot} aria-hidden="true" />
              Developer guide <span className={styles.eyebrowDivider}>/</span> Quick start
            </div>
            <h1 id="developers-title">
              Start with one script.
              <br />
              <em>Grow from there.</em>
            </h1>
            <p>
              Add simple, privacy-minded analytics to your website. Start with page views, then
              measure the actions that matter to you.
            </p>
            <div className={styles.heroActions}>
              <a href="#setup" className={`button buttonPrimary ${styles.heroPrimary}`}>
                Follow the quick start <span aria-hidden="true">↓</span>
              </a>
              <a href="#privacy" className={styles.heroSecondary}>
                How data is handled <span aria-hidden="true">↗</span>
              </a>
            </div>
            <div className={styles.heroMeta}>
              <span>
                <i /> No package to install
              </span>
              <span>
                <i /> Do Not Track respected
              </span>
            </div>
          </div>

          <div className={styles.heroVisual} aria-hidden="true">
            <div className={styles.editorGlow} />
            <div className={styles.editorCard}>
              <div className={styles.editorTop}>
                <div>
                  <i />
                  <i />
                  <i />
                </div>
                <span>index.html</span>
                <span className={styles.editorLanguage}>HTML</span>
              </div>
              <div className={styles.editorBody}>
                <div className={styles.editorLabel}>ADD TO YOUR WEBSITE</div>
                <div className={styles.editorCode}>
                  <span className={styles.lineNumber}>01</span>
                  <code>
                    <b>&lt;script</b> defer
                  </code>
                </div>
                <div className={styles.editorCode}>
                  <span className={styles.lineNumber}>02</span>
                  <code>
                    src=<em>"https://…/tracker.js"</em>
                  </code>
                </div>
                <div className={styles.editorCode}>
                  <span className={styles.lineNumber}>03</span>
                  <code>
                    data-site-key=<em>"vk_…"</em>
                    <b>&gt;&lt;/script&gt;</b>
                  </code>
                </div>
                <div className={styles.editorHint}>Replace the sample values with your own.</div>
              </div>
              <div className={styles.editorStatus}>
                <span>
                  <i /> Ready when you are
                </span>
                <span>01 / 03</span>
              </div>
            </div>
            <div className={styles.editorBadge}>
              <span>✓</span>
              <span>
                <strong>Lightweight by default</strong>
                <small>No extra package required</small>
              </span>
            </div>
          </div>
        </section>

        <div className={styles.content}>
          <nav className={styles.toc} aria-label="On this page">
            <span className={styles.tocLabel}>On this page</span>
            <a href="#setup">
              <span>01</span> Set up a site
            </a>
            <a href="#tracker">
              <span>02</span> Add the tracker
            </a>
            <a href="#events">
              <span>03</span> Track an action
            </a>
            <a href="#privacy">
              <span>04</span> Privacy and behavior
            </a>
            <div className={styles.tocHelp}>
              <span>Already set up?</span>
              <Link href="/login">
                Open your dashboard <span aria-hidden="true">↗</span>
              </Link>
            </div>
          </nav>

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
                  <strong>Sign in and add a site.</strong> An administrator can open <b>Sites</b>{" "}
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

            <section id="tracker" className={styles.section}>
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
                The collector also accepts the legacy <code>welcome_*</code> event format. Keep only
                one automatic page-view tracker active at a time.
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
