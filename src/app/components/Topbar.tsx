import Link from "next/link";
import { logoutAction } from "@/app/login/actions";
import { selectOrganizationAction } from "@/app/organizations/actions";
import { selectWorkspaceAction } from "@/app/projects/actions";
import type { CurrentUser, OrganizationAdmin } from "@/lib/auth";
import type { WorkspaceChoice } from "./workspace-switcher/useWorkspaceSwitcher";
import { BrandIcon } from "./BrandIcon";
import { OrganizationSwitcher } from "./OrganizationSwitcher";
import { WorkspaceSwitcher } from "./WorkspaceSwitcher";
import styles from "./topbar.module.css";

export function Topbar({
  user,
  section,
  workspaces,
}: {
  user: CurrentUser | OrganizationAdmin;
  section: "dashboard" | "settings" | "organization-admin";
  workspaces?: WorkspaceChoice[];
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
            <WorkspaceSwitcher
              workspaces={workspaces}
              currentWorkspaceId={workspaceUser.workspaceId}
              currentWorkspaceName={workspaceUser.workspaceName}
              action={selectWorkspaceAction}
            />
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
