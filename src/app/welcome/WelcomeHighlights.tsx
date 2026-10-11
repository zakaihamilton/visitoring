import styles from "../welcome.module.css";

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

export function BenefitsSection() {
  return (
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
  );
}

export function InsightsSection() {
  return (
    <section className={styles.insights} aria-labelledby="insights-title">
      <div className={styles.sectionIntro}>
        <div className={styles.sectionEyebrow}>Useful at a glance</div>
        <h2 id="insights-title">A clearer picture of what happens on your site.</h2>
        <p>
          Follow activity from the first page view to the actions that matter, with the reports you
          need close at hand.
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
  );
}
