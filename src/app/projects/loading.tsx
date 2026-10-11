import Link from "next/link";
import { BrandIcon } from "@/app/components/BrandIcon";
import styles from "./projects.module.css";

const projectSkeletons = ["first", "second", "third"];

export default function Loading() {
  return (
    <main className={styles.page} aria-busy="true" aria-label="Loading projects">
      <header className={styles.header}>
        <Link href="/projects" className={styles.brand}>
          <BrandIcon />
          <span>Visitoring</span>
        </Link>
        <span className={styles.loadingAccount} aria-hidden="true" />
      </header>

      <section className={styles.content}>
        <div className="eyebrow">Your projects</div>
        <h1>Loading projects…</h1>
        <p className={styles.intro}>Checking your access and loading available projects.</p>
        <div className={styles.grid} aria-hidden="true">
          {projectSkeletons.map((project) => (
            <div className={`${styles.card} ${styles.loadingCard}`} key={project}>
              <span className={styles.loadingCardTop} />
              <span className={styles.loadingCardTitle} />
              <span className={styles.loadingCardFoot} />
            </div>
          ))}
        </div>
      </section>
    </main>
  );
}
