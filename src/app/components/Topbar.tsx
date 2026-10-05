import Link from "next/link";
import { logoutAction } from "@/app/login/actions";
import type { CurrentUser } from "@/lib/auth";
import styles from "./topbar.module.css";

export function Topbar({ user, section }: { user: CurrentUser; section: "dashboard" | "sites" }) {
  return (
    <header className={styles.header}>
      <div className={styles.left}>
        <Link href="/dashboard" className={styles.brand}>
          <span className="brandMark">v</span>
          <span>Visitoring</span>
        </Link>
        <span className={styles.divider} />
        <span className={styles.workspace}>{user.workspaceName}</span>
      </div>
      <nav className={styles.nav} aria-label="Main navigation">
        <Link href="/dashboard" aria-current={section === "dashboard" ? "page" : undefined}>
          Overview
        </Link>
        {user.role === "admin" ? (
          <Link href="/sites" aria-current={section === "sites" ? "page" : undefined}>
            Sites
          </Link>
        ) : null}
      </nav>
      <div className={styles.account}>
        <span className={styles.avatar}>{user.email.charAt(0).toUpperCase()}</span>
        <span className={styles.email}>{user.email}</span>
        <form action={logoutAction}>
          <button type="submit" className={styles.logout}>
            Sign out
          </button>
        </form>
      </div>
    </header>
  );
}
