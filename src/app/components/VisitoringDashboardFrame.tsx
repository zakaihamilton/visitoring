import type { ReactNode } from "react";
import Link from "next/link";
import { DashboardShell } from "panel-frame-ui";
import { BrandIcon } from "@/app/components/BrandIcon";
import { OrganizationSwitcher } from "@/app/components/OrganizationSwitcher";
import { ProjectSwitcher } from "@/app/components/ProjectSwitcher";
import { ThemeControl } from "@/app/components/ThemeControl";
import { logoutAction } from "@/app/login/actions";
import { selectOrganizationAction } from "@/app/organizations/actions";
import { selectProjectAction } from "@/app/projects/actions";
import type { CurrentUser, OrganizationAdmin } from "@/lib/auth";

type VisitoringPage =
  | "overview"
  | "events"
  | "chart-data"
  | "projects"
  | "sites"
  | "users"
  | "setup"
  | "organization-admin";

type DashboardActor = CurrentUser | OrganizationAdmin;
type OrganizationContext = {
  organizationId: string;
  organizations: OrganizationAdmin["organizations"];
  canManageOrganization: boolean;
};

export function VisitoringDashboardFrame({
  user,
  organizationContext,
  active,
  title = "Visitoring",
  analyticsNavigation,
  children,
}: {
  user?: DashboardActor;
  organizationContext?: OrganizationContext;
  active: VisitoringPage;
  title?: string;
  analyticsNavigation?: ReactNode;
  children: ReactNode;
}) {
  const projectUser = user && "projectName" in user ? user : null;
  const organizations = user?.organizations ?? organizationContext?.organizations;
  const organizationId = user?.organizationId ?? organizationContext?.organizationId;
  const canManageOrganization = projectUser
    ? projectUser.canManageOrganization
    : user
      ? true
      : organizationContext?.canManageOrganization ?? false;

  return (
    <DashboardShell
      contentAsMain={false}
      brand={
        <Link className="pf-brand" href={projectUser ? "/dashboard" : "/projects"}>
          <BrandIcon />
          <span>Visitoring</span>
        </Link>
      }
      sidebarContext={
        organizations && organizationId ? (
          <div className="pf-visitoring-switchers">
            {projectUser ? (
              <ProjectSwitcher
                currentProjectId={projectUser.projectId}
                currentProjectName={projectUser.projectName}
                action={selectProjectAction}
              />
            ) : null}
            <OrganizationSwitcher
              organizations={organizations}
              currentOrganizationId={organizationId}
              action={selectOrganizationAction}
            />
          </div>
        ) : undefined
      }
      navigation={
        <>
          {projectUser ? (
            analyticsNavigation ?? (
              <nav aria-label="Analytics pages" className="pf-sidebar-group">
                <p className="pf-sidebar-group-label">Analytics</p>
                <Link className="pf-sidebar-link" href="/dashboard" aria-current={active === "overview" ? "page" : undefined}>
                  Traffic overview
                </Link>
                <Link className="pf-sidebar-link" href="/dashboard/events" aria-current={active === "events" ? "page" : undefined}>
                  Recent events
                </Link>
                <Link className="pf-sidebar-link" href="/dashboard/chart-data" aria-current={active === "chart-data" ? "page" : undefined}>
                  Chart data
                </Link>
              </nav>
            )
          ) : null}
          <div className="pf-sidebar-group">
            <p className="pf-sidebar-group-label">Workspace</p>
            <Link className="pf-sidebar-link" href="/projects" aria-current={active === "projects" ? "page" : undefined}>
              Projects
            </Link>
            {projectUser?.role === "admin" ? (
              <>
                <Link className="pf-sidebar-link" href="/settings/sites" aria-current={active === "sites" ? "page" : undefined}>
                  Sites and tracking
                </Link>
                <Link className="pf-sidebar-link" href="/settings/users" aria-current={active === "users" ? "page" : undefined}>
                  Team members
                </Link>
                <Link className="pf-sidebar-link" href="/settings/setup" aria-current={active === "setup" ? "page" : undefined}>
                  Installation guide
                </Link>
              </>
            ) : null}
            {canManageOrganization ? (
              <Link className="pf-sidebar-link" href="/organization/admin" aria-current={active === "organization-admin" ? "page" : undefined}>
                Organization admin
              </Link>
            ) : null}
          </div>
        </>
      }
      sidebarFooter={
        <>
          <ThemeControl />
          {user?.email ? <span className="pf-account-label">{user.email}</span> : null}
          <form action={logoutAction}>
            <button className="pf-sidebar-link pf-sign-out" type="submit">
              Sign out
            </button>
          </form>
        </>
      }
      toolbar={<span className="pf-toolbar-title">{title}</span>}
    >
      {children}
    </DashboardShell>
  );
}
