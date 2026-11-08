import Link from "next/link";
import styles from "./settings-shell.module.css";

export function SettingsNavigation({ active }: { active: "sites" | "setup" | "users" }) {
  return (
    <div className={styles.navShell}>
      <div className={styles.navInner}>
        <span className={styles.navLabel}>Project settings</span>
        <nav className={styles.nav} aria-label="Settings pages">
          <Link href="/settings/sites" aria-current={active === "sites" ? "page" : undefined}>
            Sites
          </Link>
          <Link href="/settings/users" aria-current={active === "users" ? "page" : undefined}>
            Users
          </Link>
          <Link href="/settings/setup" aria-current={active === "setup" ? "page" : undefined}>
            Setup
          </Link>
        </nav>
      </div>
    </div>
  );
}
