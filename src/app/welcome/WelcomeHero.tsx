import Link from "next/link";
import { PublicHero } from "@/app/components/PublicHero";
import { DashboardSignInLink } from "./DashboardSignInLink";
import styles from "./WelcomeHero.module.css";

export function WelcomeHero() {
  return (
    <PublicHero
      titleId="welcome-title"
      classNames={styles}
      eyebrow="Private website analytics"
      title={
        <>
          Know your traffic.
          <br />
          <em>Keep it simple.</em>
        </>
      }
      description="Understand what brings people to your site and what they do next, with clear insights and thoughtful data collection."
      actions={({ primary, secondary }) => (
        <>
          <DashboardSignInLink className={primary} />
          <Link href="/developers" className={secondary}>
            See how it works <span aria-hidden="true">↗</span>
          </Link>
        </>
      )}
      footer={
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
      }
      visual={
        <>
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
                {Array.from({ length: 12 }, (_, index) => (
                  <i key={index} />
                ))}
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
        </>
      }
    />
  );
}
