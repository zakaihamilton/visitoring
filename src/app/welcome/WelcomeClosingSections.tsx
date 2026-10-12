import Link from "next/link";
import { Tooltip } from "@/app/components/Tooltip";
import { DashboardSignInLink } from "./DashboardSignInLink";
import styles from "../welcome.module.css";

export function CustomEventsSection() {
  return (
    <section className={styles.actionsSection} aria-labelledby="actions-title">
      <div className={styles.actionsCopy}>
        <div className={styles.sectionEyebrow}>Beyond page views</div>
        <h2 id="actions-title">Measure the moments that move your work forward.</h2>
        <p>
          Track a completed signup or another important action with a custom event. Then use the
          dashboard to see when and on which pages those events happen.
        </p>
        <Link href="/developers#events" className={styles.inlineLink}>
          Explore custom events <span aria-hidden="true">↗</span>
        </Link>
      </div>

      <div className={styles.eventExample}>
        <div className={styles.eventExampleTop}>
          <span>
            <i /> Event example
          </span>
          <span>After signup succeeds</span>
        </div>
        <pre>
          <code>
            <span>window.Visitoring</span>.track(
            <br />
            &nbsp;&nbsp;<em>"signup"</em>, &#123; plan: <em>"starter"</em> &#125;
            <br />
            );
          </code>
        </pre>
        <p>
          Choose an event name and include only the details that help you. Avoid names, email
          addresses, account IDs, or other personal data. Use broad values such as plan type.
        </p>
      </div>
    </section>
  );
}

export function PrivacySection() {
  return (
    <section className={styles.privacySection} aria-labelledby="privacy-title">
      <div className={styles.privacyCopy}>
        <div className={styles.privacyEyebrow}>Privacy by design</div>
        <h2 id="privacy-title">Useful context. Less personal data.</h2>
        <p>
          Get a practical view of your traffic without collecting more detail than the job needs.
        </p>
      </div>
      <ul className={styles.privacyPoints}>
        <li>
          <span aria-hidden="true">✓</span>
          Raw IP addresses are never stored.
        </li>
        <li>
          <span aria-hidden="true">✓</span>
          No cookies; anonymous visitor and session codes stay in the browser.
        </li>
        <li>
          <span aria-hidden="true">✓</span>
          Browser details are reduced to broad categories, and Do Not Track is respected.{" "}
          <Tooltip
            label="Do Not Track"
            content="Visitoring honors the browser preference by not collecting events when it is enabled."
          />
        </li>
        <li>
          <span aria-hidden="true">✓</span>
          Page paths and referring website names are recorded without query details.
        </li>
      </ul>
    </section>
  );
}

export function SetupSection() {
  return (
    <section className={styles.setupSection} aria-labelledby="setup-title">
      <div className={styles.sectionIntro}>
        <div className={styles.sectionEyebrow}>A straightforward start</div>
        <h2 id="setup-title">One small script gets you going.</h2>
        <p>
          Add the deferred tracker to your site. There is no package to install, and custom events
          are there when you need them.
        </p>
        <Link href="/developers" className={styles.inlineLink}>
          Read the setup guide <span aria-hidden="true">↗</span>
        </Link>
      </div>

      <ol className={styles.setupSteps}>
        <li>
          <span>01</span>
          <div>
            <strong>Create a site</strong>
            <p>An administrator adds the website and its approved address.</p>
          </div>
        </li>
        <li>
          <span>02</span>
          <div>
            <strong>Add the tracker</strong>
            <p>Place the script on the pages you want to understand.</p>
          </div>
        </li>
        <li>
          <span>03</span>
          <div>
            <strong>Follow what matters</strong>
            <p>Review activity or add custom events for key actions.</p>
          </div>
        </li>
      </ol>
    </section>
  );
}

export function ClosingCta() {
  return (
    <section className={styles.closingCta} aria-labelledby="cta-title">
      <div>
        <div className={styles.ctaEyebrow}>Visitoring</div>
        <h2 id="cta-title">Make your traffic easier to understand.</h2>
        <p>Sign in to view your dashboard, or visit the guide to see how setup works.</p>
      </div>
      <div className={styles.ctaActions}>
        <DashboardSignInLink className={`button ${styles.ctaPrimary}`} />
        <Link href="/developers" className={styles.ctaSecondary}>
          See the developer guide
        </Link>
      </div>
    </section>
  );
}

export function WelcomeFooter() {
  return (
    <footer className={styles.footer}>
      <span>
        <span className={styles.footerMark}>v</span> Visitoring
      </span>
      <span>
        Private analytics for the sites you run. Accounts are created by a project administrator.
      </span>
    </footer>
  );
}
