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
            <div className={styles.eyebrow}>Private website analytics</div>
            <h1 id="welcome-title">
              Know your traffic.
              <br />
              <em>Keep it simple.</em>
            </h1>
            <p>
              See how people find and use your sites, with clear analytics that collect only what
              they need.
            </p>
            <ul className={styles.topics}>
              <li>Page views</li>
              <li>Traffic sources</li>
              <li>Custom events</li>
            </ul>
          </div>
        </section>

        <section className={styles.highlights} aria-label="Visitoring highlights">
          {highlights.map((highlight) => (
            <article className={styles.highlight} key={highlight.title}>
              <h2>{highlight.title}</h2>
              <p>{highlight.description}</p>
            </article>
          ))}
        </section>

        <footer className={styles.footer}>
          <span>Private analytics for the sites you run.</span>
          <span>Accounts are created by a project administrator.</span>
        </footer>
      </div>
    </main>
  );
}
