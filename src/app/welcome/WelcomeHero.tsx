import Link from "next/link";
import { DashboardSignInLink } from "./DashboardSignInLink";
import styles from "../welcome.module.css";

export function WelcomeHero() {
  return (
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
          Understand what brings people to your site and what they do next, with clear insights and
          thoughtful data collection.
        </p>
        <div className={styles.heroActions}>
          <DashboardSignInLink className={`button buttonPrimary ${styles.heroPrimary}`} />
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
  );
}
