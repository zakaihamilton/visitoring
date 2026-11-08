import Link from "next/link";
import { logoutAction } from "@/app/login/actions";
import { selectOrganizationAction } from "@/app/organizations/actions";
import { selectProjectAction } from "@/app/projects/actions";
import type { CurrentUser, OrganizationAdmin } from "@/lib/auth";
import type { ProjectChoice } from "./project-switcher/useProjectSwitcher";
import { BrandIcon } from "./BrandIcon";
import { OrganizationSwitcher } from "./OrganizationSwitcher";
import { ProjectSwitcher } from "./ProjectSwitcher";
import { ThemeControl } from "./ThemeControl";
import styles from "./topbar.module.css";

export function Topbar({
  user,
  section,
  projects,
}: {
  user: CurrentUser | OrganizationAdmin;
  section: "dashboard" | "settings" | "organization-admin";
  projects?: ProjectChoice[];
}) {
  const projectUser = "projectName" in user ? user : null;
  const canManageOrganization = projectUser ? projectUser.canManageOrganization : true;

  return (
    <header className={styles.header}>
      <div className={styles.left}>
        <Link href={projectUser ? "/dashboard" : "/projects"} className={styles.brand}>
          <BrandIcon />
          <span>Visitoring</span>
        </Link>
        {projectUser ? (
          <>
            <span className={styles.divider} />
            <ProjectSwitcher
              projects={projects}
              currentProjectId={projectUser.projectId}
              currentProjectName={projectUser.projectName}
              action={selectProjectAction}
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
        {projectUser ? (
          <Link href="/dashboard" aria-current={section === "dashboard" ? "page" : undefined}>
            Overview
          </Link>
        ) : null}
        {projectUser?.role === "admin" ? (
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
        <ThemeControl />
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
