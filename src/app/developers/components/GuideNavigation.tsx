import Link from "next/link";
import styles from "../developers.module.css";

export function GuideNavigation() {
  return (
    <nav className={styles.toc} aria-label="On this page">
      <span className={styles.tocLabel}>On this page</span>
      <a href="#setup">
        <span>01</span> Set up a site
      </a>
      <a href="#tracker">
        <span>02</span> Add the tracker
      </a>
      <a href="#events">
        <span>03</span> Track an action
      </a>
      <a href="#privacy">
        <span>04</span> Privacy and behavior
      </a>
      <div className={styles.tocHelp}>
        <span>Already set up?</span>
        <Link href="/login">
          Open your dashboard <span aria-hidden="true">↗</span>
        </Link>
      </div>
    </nav>
  );
}
