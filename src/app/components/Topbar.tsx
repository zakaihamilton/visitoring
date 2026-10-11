import Link from "next/link";
import { logoutAction } from "@/app/login/actions";
import { selectOrganizationAction } from "@/app/organizations/actions";
import type { CurrentUser } from "@/lib/auth";
import { BrandIcon } from "./BrandIcon";
import { OrganizationSwitcher } from "./OrganizationSwitcher";
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
        <Link href="/projects" className={styles.workspace} title="Switch project">
          {user.workspaceName}
        </Link>
        <span className={styles.divider} />
        <OrganizationSwitcher
          organizations={user.organizations}
          currentOrganizationId={user.organizationId}
          action={selectOrganizationAction}
        />
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
