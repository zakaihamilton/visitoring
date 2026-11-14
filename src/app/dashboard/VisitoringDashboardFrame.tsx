import Link from "next/link";
import type { ReactNode } from "react";
import { DashboardShell } from "panel-frame-ui";
import { BrandIcon } from "@/app/components/BrandIcon";
import { OrganizationSwitcher } from "@/app/components/OrganizationSwitcher";
import { ProjectSwitcher } from "@/app/components/ProjectSwitcher";
import { ThemeControl } from "@/app/components/ThemeControl";
import { logoutAction } from "@/app/login/actions";
import { selectOrganizationAction } from "@/app/organizations/actions";
import { selectProjectAction } from "@/app/projects/actions";
import type { CurrentUser, OrganizationAdmin } from "@/lib/auth";

export type VisitoringPage =
  | "overview"
  | "events"
  | "chart-data"
  | "projects"
  | "sites"
  | "users"
  | "setup"
  | "organization-admin";

type DashboardActor = CurrentUser | OrganizationAdmin;

export function VisitoringDashboardFrame({
  user,
  active,
  title = "Visitoring",
  analyticsNavigation,
  children,
}: {
  user?: DashboardActor;
  active: VisitoringPage;
  title?: string;
  analyticsNavigation?: ReactNode;
  children: ReactNode;
}) {
  const projectUser = user && "projectName" in user ? user : null;
  const canManageOrganization = projectUser ? projectUser.canManageOrganization : Boolean(user);

  return (
    <DashboardShell
      contentAsMain={false}
      brand={
        <Link className="pf-brand" href="/dashboard">
          <BrandIcon />
          <span>Visitoring</span>
        </Link>
      }
      sidebarContext={
        <div className="pf-visitoring-switchers">
          {projectUser ? (
            <ProjectSwitcher
              currentProjectId={projectUser.projectId}
              currentProjectName={projectUser.projectName}
              action={selectProjectAction}
            />
          ) : null}
          {user ? (
            <OrganizationSwitcher
              organizations={user.organizations}
              currentOrganizationId={user.organizationId}
              action={selectOrganizationAction}
            />
          ) : (
            <span className="pf-skeleton" aria-hidden="true" />
          )}
        </div>
      }
      navigation={
        <>
          {projectUser
            ? (analyticsNavigation ?? (
                <nav aria-label="Analytics pages" className="pf-sidebar-group">
                  <p className="pf-sidebar-group-label">Analytics</p>
                  <Link
                    className="pf-sidebar-link"
                    href="/dashboard"
                    aria-current={active === "overview" ? "page" : undefined}
                  >
                    Traffic overview
                  </Link>
                  <Link
                    className="pf-sidebar-link"
                    href="/dashboard/events"
                    aria-current={active === "events" ? "page" : undefined}
                  >
                    Recent events
                  </Link>
                  <Link
                    className="pf-sidebar-link"
                    href="/dashboard/chart-data"
                    aria-current={active === "chart-data" ? "page" : undefined}
                  >
                    Chart data
                  </Link>
                </nav>
              ))
            : null}
          <div className="pf-sidebar-group">
            <p className="pf-sidebar-group-label">Workspace</p>
            <Link
              className="pf-sidebar-link"
              href="/projects"
              aria-current={active === "projects" ? "page" : undefined}
            >
              Projects
            </Link>
            {projectUser?.role === "admin" ? (
              <>
                <Link
                  className="pf-sidebar-link"
                  href="/settings/sites"
                  aria-current={active === "sites" ? "page" : undefined}
                >
                  Sites and tracking
                </Link>
                <Link
                  className="pf-sidebar-link"
                  href="/settings/users"
                  aria-current={active === "users" ? "page" : undefined}
                >
                  Team members
                </Link>
                <Link
                  className="pf-sidebar-link"
                  href="/settings/setup"
                  aria-current={active === "setup" ? "page" : undefined}
                >
                  Installation guide
                </Link>
              </>
            ) : null}
            {canManageOrganization ? (
              <Link
                className="pf-sidebar-link"
                href="/organization/admin"
                aria-current={active === "organization-admin" ? "page" : undefined}
              >
                Organization admin
              </Link>
            ) : null}
          </div>
        </>
      }
      sidebarFooter={
        user ? (
          <>
            <ThemeControl />
            <span className="pf-account-label">{user.email ?? "Visitoring account"}</span>
            <form action={logoutAction}>
              <button className="pf-sidebar-link pf-sign-out" type="submit">
                Sign out
              </button>
            </form>
          </>
        ) : (
          <ThemeControl />
        )
      }
      toolbar={<span className="pf-toolbar-title">{title}</span>}
    >
      {children}
    </DashboardShell>
  );
}
