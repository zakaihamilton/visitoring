import Link from "next/link";
import { logoutAction } from "@/app/login/actions";
import { selectOrganizationAction } from "@/app/organizations/actions";
import type { CurrentUser, OrganizationAdmin } from "@/lib/auth";
import { BrandIcon } from "./BrandIcon";
import { OrganizationSwitcher } from "./OrganizationSwitcher";
import styles from "./topbar.module.css";

export function Topbar({
  user,
  section,
}: {
  user: CurrentUser | OrganizationAdmin;
  section: "dashboard" | "settings" | "organization-admin";
}) {
  const workspaceUser = "workspaceName" in user ? user : null;
  const canManageOrganization = workspaceUser ? workspaceUser.canManageOrganization : true;

  return (
    <header className={styles.header}>
      <div className={styles.left}>
        <Link href={workspaceUser ? "/dashboard" : "/projects"} className={styles.brand}>
          <BrandIcon />
          <span>Visitoring</span>
        </Link>
        {workspaceUser ? (
          <>
            <span className={styles.divider} />
            <Link href="/projects" className={styles.workspace} title="Switch project">
              {workspaceUser.workspaceName}
            </Link>
          </>
        ) : null}
        <span className={styles.divider} />
        <OrganizationSwitcher
          organizations={user.organizations}
          currentOrganizationId={user.organizationId}
          action={selectOrganizationAction}
        />
      </div>
      <nav className={styles.nav} aria-label="Main navigation">
        {workspaceUser ? (
          <Link href="/dashboard" aria-current={section === "dashboard" ? "page" : undefined}>
            Overview
          </Link>
        ) : null}
        {workspaceUser?.role === "admin" ? (
          <Link href="/settings/sites" aria-current={section === "settings" ? "page" : undefined}>
            Settings
          </Link>
        ) : null}
        {canManageOrganization ? (
          <Link
            href="/organization/admin"
            aria-current={section === "organization-admin" ? "page" : undefined}
          >
            Admin
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
