import Link from "next/link";
import { Tooltip } from "@/app/components/Tooltip";
import { PublicHeader } from "@/app/components/PublicHeader";
import styles from "./welcome.module.css";

const highlights = [
  {
    title: "See what matters",
    description: "Follow page views, visitors, and the pages people return to.",
  },
  {
    title: "Understand what works",
    description: "Track the actions that matter to your site with custom events.",
  },
  {
    title: "Collect less",
    description: "Get useful trends without saving IP addresses or full browser details.",
  },
];

export default function HomePage() {
  return (
    <main className={styles.page}>
      <div className={styles.shell}>
        <PublicHeader page="welcome" />

        <section className={styles.hero} aria-labelledby="welcome-title">
          <div className={styles.heroCopy}>
            <div className={styles.eyebrow}>
              <span className={styles.eyebrowDot} aria-hidden="true" />
              Private website analytics
            </div>
            <h1 id="welcome-title">
              Know your traffic.
              <br />
              <em>Keep it simple.</em>
            </h1>
            <p>
              Understand what brings people to your site and what they do next, with clear insights
              and thoughtful data collection.
            </p>
            <div className={styles.heroActions}>
              <Link href="/login" className={`button buttonPrimary ${styles.heroPrimary}`}>
                Go to your dashboard <span aria-hidden="true">↗</span>
              </Link>
              <Link href="/developers" className={styles.heroSecondary}>
                See how it works <span aria-hidden="true">↓</span>
              </Link>
            </div>
            <ul className={styles.topics}>
              <li>
                <span aria-hidden="true" />
                Page views
              </li>
              <li>
                <span aria-hidden="true" />
                Traffic sources
              </li>
              <li>
                <span aria-hidden="true" />
                Custom events
              </li>
            </ul>
          </div>

          <div className={styles.heroVisual} aria-hidden="true">
            <div className={styles.previewGlow} />
            <div className={styles.preview}>
              <div className={styles.previewTop}>
                <div className={styles.previewBrand}>
                  <span className={styles.previewMark}>v</span>
                  <span>Visitoring</span>
                </div>
                <span className={styles.previewPeriod}>
                  Last 7 days <b>⌄</b>
                </span>
              </div>
              <div className={styles.previewIntro}>
                <span>Sample project</span>
                <strong>Marketing site</strong>
              </div>
              <div className={styles.previewMetrics}>
                <div>
                  <span>Page views</span>
                  <strong>12,480</strong>
                  <small>↗ 18.4%</small>
                </div>
                <div>
                  <span>Visitors</span>
                  <strong>4,210</strong>
                  <small>↗ 12.6%</small>
                </div>
              </div>
              <div className={styles.chartHeading}>
                <span>Activity over time</span>
                <span>Page views</span>
              </div>
              <div className={styles.chart}>
                <div className={styles.chartLines}>
                  <i />
                  <i />
                  <i />
                </div>
                <div className={styles.chartBars}>
                  <i />
                  <i />
                  <i />
                  <i />
                  <i />
                  <i />
                  <i />
                  <i />
                  <i />
                  <i />
                  <i />
                  <i />
                </div>
              </div>
              <div className={styles.previewFooter}>
                <span>
                  <i /> Privacy by design
                </span>
                <span>Sample data</span>
              </div>
            </div>
            <div className={styles.floatingNote}>
              <span className={styles.noteIcon}>↗</span>
              <span>
                <strong>Useful signals.</strong>
                <small>No noisy tracking.</small>
              </span>
            </div>
          </div>
        </section>

        <section className={styles.benefits} aria-labelledby="benefits-title">
          <div className={styles.benefitsHeading}>
            <div className={styles.sectionEyebrow}>Less noise, more clarity</div>
            <h2 id="benefits-title">The details that help you move forward.</h2>
          </div>
          <div className={styles.highlights}>
            {highlights.map((highlight, index) => (
              <article className={styles.highlight} key={highlight.title}>
                <span className={styles.highlightIndex}>0{index + 1}</span>
                <h3>{highlight.title}</h3>
                <p>{highlight.description}</p>
                <span className={styles.highlightArrow} aria-hidden="true">
                  ↗
                </span>
              </article>
            ))}
          </div>
        </section>

        <section className={styles.insights} aria-labelledby="insights-title">
          <div className={styles.sectionIntro}>
            <div className={styles.sectionEyebrow}>Useful at a glance</div>
            <h2 id="insights-title">A clearer picture of what happens on your site.</h2>
            <p>
              Follow activity from the first page view to the actions that matter, with the reports
              you need close at hand.
            </p>
          </div>

          <div className={styles.insightGrid}>
            <article className={styles.insightCard}>
              <span className={styles.cardLabel}>01 / ACTIVITY</span>
              <h3>Know the rhythm of your traffic.</h3>
              <p>See page views, visitors, and sessions alongside daily activity.</p>
              <div className={styles.metricChips}>
                <span>Page views</span>
                <span>Visitors</span>
                <span>Sessions</span>
              </div>
            </article>

            <article className={styles.insightCard}>
              <span className={styles.cardLabel}>02 / DISCOVERY</span>
              <h3>See what brings people in.</h3>
              <p>Find your popular pages and the referring websites sending visits.</p>
              <div className={styles.pathPreview} aria-hidden="true">
                <span>
                  <i /> Popular pages
                </span>
                <span>
                  <i /> Traffic sources
                </span>
              </div>
            </article>

            <article className={styles.insightCard}>
              <span className={styles.cardLabel}>03 / CONTEXT</span>
              <h3>Understand the broad picture.</h3>
              <p>Explore device, browser, operating system, country, and region summaries.</p>
              <div className={styles.contextTags} aria-hidden="true">
                <span>Device</span>
                <span>Browser</span>
                <span>Region</span>
              </div>
            </article>
          </div>
        </section>

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
            <p>Choose an event name and include only the details that help you.</p>
          </div>
        </section>

        <section className={styles.privacySection} aria-labelledby="privacy-title">
          <div className={styles.privacyCopy}>
            <div className={styles.privacyEyebrow}>Privacy by design</div>
            <h2 id="privacy-title">Useful context. Less personal data.</h2>
            <p>
              Get a practical view of your traffic without collecting more detail than the job
              needs.
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

        <section className={styles.setupSection} aria-labelledby="setup-title">
          <div className={styles.sectionIntro}>
            <div className={styles.sectionEyebrow}>A straightforward start</div>
            <h2 id="setup-title">One small script gets you going.</h2>
            <p>
              Add the deferred tracker to your site. There is no package to install, and custom
              events are there when you need them.
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

        <section className={styles.closingCta} aria-labelledby="cta-title">
          <div>
            <div className={styles.ctaEyebrow}>Visitoring</div>
            <h2 id="cta-title">Make your traffic easier to understand.</h2>
            <p>Sign in to view your dashboard, or visit the guide to see how setup works.</p>
          </div>
          <div className={styles.ctaActions}>
            <Link href="/login" className={`button ${styles.ctaPrimary}`}>
              Go to your dashboard <span aria-hidden="true">↗</span>
            </Link>
            <Link href="/developers" className={styles.ctaSecondary}>
              See the developer guide
            </Link>
          </div>
        </section>

        <footer className={styles.footer}>
          <span>
            <span className={styles.footerMark}>v</span> Visitoring
          </span>
          <span>
            Private analytics for the sites you run. Accounts are created by a project
            administrator.
          </span>
        </footer>
      </div>
    </main>
  );
}
