import { Skeleton, LoadingStatus } from "@/app/components/Skeleton";
import { BrandIcon } from "@/app/components/BrandIcon";
import styles from "./projects.module.css";

const projectSkeletons = ["first", "second", "third"];

export default function Loading() {
  return (
    <>
      <LoadingStatus>Loading projects…</LoadingStatus>
      <main className={styles.page} aria-busy="true" aria-label="Loading projects">
        <header className={styles.header}>
          <span className={styles.brand}>
            <BrandIcon />
            <span>Visitoring</span>
          </span>
          <div className={styles.account} aria-hidden="true">
            <Skeleton width={150} height={34} />
            <Skeleton width={78} height={34} />
          </div>
        </header>

        <section className={styles.content} aria-hidden="true">
          <div className="eyebrow">Your projects</div>
          <h1>Choose a project</h1>
          <p className={styles.intro}>Open a Visitoring project to view its sites and analytics.</p>
          <div className={styles.grid} aria-hidden="true">
            {projectSkeletons.map((project) => (
              <div className={`${styles.card} ${styles.loadingCard}`} key={project}>
                <div className={styles.cardTop}>
                  <Skeleton width={42} height={42} />
                  <Skeleton width={60} height={24} />
                </div>
                <Skeleton className={styles.projectName} width="64%" height={24} />
                <div className={styles.cardBottom}>
                  <Skeleton width={105} />
                  <Skeleton width={14} />
                </div>
              </div>
            ))}
          </div>
        </section>
      </main>
    </>
  );
}
