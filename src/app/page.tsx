import Link from "next/link";
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
