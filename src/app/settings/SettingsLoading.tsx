import { Skeleton, LoadingStatus, TopbarSkeleton } from "@/app/components/Skeleton";
import { SettingsNavigation } from "./SettingsNavigation";
import page from "./settings-page.module.css";
import styles from "./loading.module.css";

const titles = { sites: "Manage your sites", users: "Manage users", setup: "Connect your website" };

export function SiteCardsSkeleton({ announce = true }: { announce?: boolean }) {
  return (
    <>
      {announce ? <LoadingStatus>Loading sites…</LoadingStatus> : null}
      <section className={page.siteList} aria-busy="true" aria-label="Loading sites">
        {["first", "second"].map((site) => (
          <section key={site} className={page.siteCard} aria-hidden="true">
            <div className={page.siteHeader}>
              <Skeleton width={180} height={22} />
              <Skeleton width={150} />
            </div>
            <div className={styles.domains}>
              <Skeleton width={138} height={28} />
              <Skeleton width={112} height={28} />
            </div>
            <div className={styles.siteControls}>
              <Skeleton width={110} height={16} />
              <div className={styles.controls}>
                <Skeleton height={42} />
                <Skeleton width={134} height={42} />
              </div>
              <Skeleton width={126} height={36} />
            </div>
          </section>
        ))}
      </section>
    </>
  );
}

export function MembersSkeleton({ announce = true }: { announce?: boolean }) {
  return (
    <>
      {announce ? <LoadingStatus>Loading workspace members…</LoadingStatus> : null}
      <section className={page.card} aria-busy="true" aria-label="Loading workspace members">
        <div aria-hidden="true">
          <div className={page.cardHeading}>
            <h2>Workspace members</h2>
          </div>
          <div className={styles.members}>
            {["first", "second", "third"].map((row) => (
              <div className={styles.member} key={row}>
                <div className={styles.memberIdentity}>
                  <Skeleton width={36} height={36} round />
                  <div>
                    <Skeleton width={160} />
                    <Skeleton width={110} height={10} />
                  </div>
                </div>
                <div className={styles.memberActions}>
                  <Skeleton width={90} height={34} />
                  <Skeleton width={75} height={34} />
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>
    </>
  );
}

export function SettingsLoading({ view = "sites" }: { view?: keyof typeof titles }) {
  return (
    <>
      <TopbarSkeleton />
      <SettingsNavigation active={view} />
      <LoadingStatus>Loading {view} settings…</LoadingStatus>
      <main className={page.page} aria-busy="true" aria-label={`Loading ${view} settings`}>
        <div className={page.intro} aria-hidden="true">
          <div className={styles.heading}>
            <div className={page.eyebrow}>Settings · {view}</div>
            <h1>{titles[view]}</h1>
            <Skeleton width={440} height={18} />
          </div>
        </div>
        {view === "setup" ? (
          <section className={page.card} aria-hidden="true">
            <div className={styles.setup}>
              <Skeleton width={220} height={24} />
              <Skeleton width="80%" height={16} />
              <div className={styles.domains}>
                <Skeleton width={100} height={38} />
                <Skeleton width={100} height={38} />
                <Skeleton width={100} height={38} />
              </div>
              <div className={styles.code}>
                {["first", "second", "third", "fourth"].map((row) => (
                  <Skeleton key={row} width={row === "third" ? "80%" : "60%"} />
                ))}
              </div>
            </div>
          </section>
        ) : (
          <>
            <section className={page.card} aria-hidden="true">
              <div className={page.cardHeading}>
                <h2>{view === "sites" ? "Add a site" : "Add a member"}</h2>
              </div>
              <div className={styles.form}>
                {["name", "address"].map((field) => (
                  <div className={styles.field} key={field}>
                    <Skeleton width={100} />
                    <Skeleton height={42} />
                  </div>
                ))}
                <Skeleton width={108} height={42} />
              </div>
              <Skeleton width="68%" height={11} />
            </section>
            {view === "sites" ? (
              <SiteCardsSkeleton announce={false} />
            ) : (
              <MembersSkeleton announce={false} />
            )}
          </>
        )}
      </main>
    </>
  );
}
