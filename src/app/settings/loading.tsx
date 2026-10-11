import styles from "./loading.module.css";

const cardSkeletons = [
  { id: "first", rows: ["first", "second"] },
  { id: "second", rows: ["first", "second", "third"] },
];

export default function Loading() {
  return (
    <>
      <header className={styles.topbar}>
        <span className={styles.brand}>Visitoring</span>
        <span className={`${styles.line} ${styles.accountLine}`} aria-hidden="true" />
      </header>
      <div className={styles.navigation} aria-hidden="true">
        <span className={styles.navLabel}>Workspace settings</span>
        <span className={`${styles.line} ${styles.navLine}`} />
        <span className={`${styles.line} ${styles.navLine}`} />
        <span className={`${styles.line} ${styles.navLine}`} />
      </div>
      <main className={styles.main} aria-busy="true" aria-label="Loading workspace settings">
        <div className={styles.eyebrow}>Workspace settings</div>
        <h1>Loading settings…</h1>
        <p>Checking access and loading workspace details.</p>
        {cardSkeletons.map((card) => (
          <section className={styles.card} aria-hidden="true" key={card.id}>
            <span className={`${styles.line} ${styles.titleLine}`} />
            {card.rows.map((row) => (
              <span className={`${styles.line} ${styles.contentLine}`} key={row} />
            ))}
          </section>
        ))}
      </main>
    </>
  );
}
