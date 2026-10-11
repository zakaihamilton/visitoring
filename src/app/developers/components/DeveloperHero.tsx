import styles from "../developers.module.css";

export function DeveloperHero() {
  return (
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
          Add simple, privacy-minded analytics to your website. Start with page views, then measure
          the actions that matter to you.
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
  );
}
