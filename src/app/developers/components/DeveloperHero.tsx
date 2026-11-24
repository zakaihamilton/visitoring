import { PublicHero } from "@/app/components/PublicHero";
import styles from "./DeveloperHero.module.css";

export function DeveloperHero() {
  return (
    <PublicHero
      titleId="developers-title"
      classNames={styles}
      eyebrow={
        <>
          Developer guide <span className={styles.eyebrowDivider}>/</span> Quick start
        </>
      }
      title={
        <>
          Start with one script.
          <br />
          <em>Grow from there.</em>
        </>
      }
      description="Add simple, privacy-minded analytics to your website. Start with page views, then measure the actions that matter to you."
      actions={({ primary, secondary }) => (
        <>
          <a href="#setup" className={primary}>
            Follow the quick start <span aria-hidden="true">↓</span>
          </a>
          <a href="#privacy" className={secondary}>
            How data is handled <span aria-hidden="true">↗</span>
          </a>
        </>
      )}
      footer={
        <div className={styles.heroMeta}>
          <span>
            <i /> No package needed for the script
          </span>
          <span>
            <i /> Do Not Track respected
          </span>
        </div>
      }
      visual={
        <>
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
              <small>Script works without a package</small>
            </span>
          </div>
        </>
      }
    />
  );
}
