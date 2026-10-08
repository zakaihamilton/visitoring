import Link from "next/link";
import { logoutAction } from "@/app/login/actions";
import type { CurrentUser } from "@/lib/auth";
import { BrandIcon } from "./BrandIcon";
import styles from "./topbar.module.css";

export function Topbar({
  user,
  section,
}: {
  user: CurrentUser;
  section: "dashboard" | "settings";
}) {
  return (
    <header className={styles.header}>
      <div className={styles.left}>
        <Link href="/dashboard" className={styles.brand}>
          <BrandIcon />
          <span>Visitoring</span>
        </Link>
        <span className={styles.divider} />
        <span className={styles.workspace}>{user.workspaceName}</span>
        <span className={styles.divider} />
        <details className={styles.organization}>
          <summary
            aria-label={`Organization: ${user.organizationName}`}
            className={styles.organizationSummary}
            title={user.organizationName}
          >
            <span className={styles.organizationName}>{user.organizationName}</span>
          </summary>
          <div className={styles.organizationPopover}>
            <span className={styles.organizationLabel}>Organization</span>
            <strong>{user.organizationName}</strong>
          </div>
        </details>
      </div>
      <nav className={styles.nav} aria-label="Main navigation">
        <Link href="/dashboard" aria-current={section === "dashboard" ? "page" : undefined}>
          Overview
        </Link>
        {user.role === "admin" ? (
          <Link href="/settings/sites" aria-current={section === "settings" ? "page" : undefined}>
            Settings
          </Link>
        ) : null}
      </nav>
      <div className={styles.account}>
        <span className={styles.avatar}>{user.email?.charAt(0).toUpperCase() ?? "V"}</span>
        <span className={styles.email}>{user.email ?? "Visitoring account"}</span>
        <form action={logoutAction}>
          <button type="submit" className={`button buttonQuiet ${styles.logout}`}>
            Sign out
          </button>
        </form>
      </div>
    </header>
  );
}
