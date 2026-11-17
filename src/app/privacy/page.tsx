import Link from "next/link";
import styles from "./privacy.module.css";

export const metadata = {
  title: "Privacy policy · Visitoring",
  description: "How Visitoring handles account information and website analytics data.",
};

export default function PrivacyPage() {
  return (
    <main className={styles.page}>
      <header className={styles.header}>
        <Link className={styles.brand} href="/">
          Visitoring
        </Link>
        <Link className={styles.backLink} href="/">
          Back to Visitoring
        </Link>
      </header>

      <article className={styles.document} aria-labelledby="privacy-title">
        <p className={styles.kicker}>Visitoring · Privacy</p>
        <h1 id="privacy-title">Privacy policy</h1>
        <p className={styles.intro}>
          Visitoring is operated by Zakai Hamilton. This policy describes information handled when
          you visit Visitoring or use its website analytics service. An organization that installs
          Visitoring chooses what its site sends and who can see its reports.
        </p>
        <p className={styles.updated}>Last updated November 17, 2026</p>

        <div className={styles.sections}>
          <section>
            <h2>Information the service handles</h2>
            <p>
              For dashboard accounts, Visitoring receives account and organization details,
              membership, and access permissions from Perminister. It also stores the project and
              site settings needed to provide analytics.
            </p>
            <p>
              When a website uses the Visitoring tracker, an event can include an anonymous visitor
              code, a session code, event name and customer-supplied properties, the page path
              without query details or fragments, the referring website hostname, a timestamp,
              broad device, browser and operating-system categories, and an approximate country or
              region. Visitoring does not use cookies for the tracker: visitor and session codes
              are kept in browser storage. The tracker respects a browser's Do Not Track setting.
            </p>
            <p>
              The request IP address may be checked briefly to estimate location and limit abusive
              traffic. Raw IP addresses are not saved in analytics event records; a one-way IP
              hash may be retained for rate limiting. The site operator chooses custom event
              properties and page paths. Do not send names, email addresses, account IDs, secrets,
              or other sensitive details in those fields.
            </p>
          </section>

          <section>
            <h2>How information is used</h2>
            <p>
              Information is used to display traffic and event reports to authorized project
              members, provide sign-in and project access, maintain the service, and protect it
              from abuse. Visitoring analytics event records are kept for a rolling 24-month
              period and older records are pruned daily. Project administrators can archive or
              permanently delete projects and their analytics.
            </p>
          </section>

          <section>
            <h2>Cookies, storage, and service providers</h2>
            <p>
              The dashboard uses an HTTP-only session cookie for sign-in and browser storage for
              the selected appearance. The tracker uses local and session browser storage for its
              anonymous codes, rather than cookies. Visitoring is hosted on Vercel, stores its
              project and analytics records in PostgreSQL, and uses Perminister for account
              identity and access control.
            </p>
            <p>
              Organization owners and administrators can see information needed to manage their
              projects. Other project members can see analytics according to their assigned roles.
              The organization that installed the tracker is the best contact for questions about
              data collected on its website.
            </p>
          </section>

          <section>
            <h2>Requests and contact</h2>
            <p>
              For a privacy question or a request about information held by Visitoring, contact
              Zakai Hamilton using the contact information on the{" "}
              <a href="https://www.perminister.com/privacy">Perminister privacy page</a>. If your
              question concerns analytics from a particular website, contact that website's
              operator as well.
            </p>
          </section>

          <section>
            <h2>Changes to this policy</h2>
            <p>
              Updates will be published on this page with a revised date. The information above
              may change as Visitoring's features and service providers change.
            </p>
          </section>
        </div>
      </article>
    </main>
  );
}
