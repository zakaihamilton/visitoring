import Link from "next/link";
import type { ReactNode } from "react";
import { BrandIcon } from "@/app/components/BrandIcon";
import { OrganizationSwitcher } from "@/app/components/OrganizationSwitcher";
import { logoutAction } from "@/app/login/actions";
import { selectOrganizationAction } from "@/app/organizations/actions";
import type { requireOrganizationWorkspaces } from "@/lib/auth";
import { selectWorkspaceAction } from "./actions";
import styles from "./projects.module.css";

function ProjectsHeader({ children }: { children?: ReactNode }) {
  return (
    <header className={styles.header}>
      <Link href="/projects" className={styles.brand}>
        <BrandIcon />
        <span>Visitoring</span>
      </Link>
      <div className={styles.account}>
        {children}
        <form action={logoutAction}>
          <button type="submit" className="button buttonQuiet">
            Sign out
          </button>
        </form>
      </div>
    </header>
  );
}

export function ProjectsView({
  workspacesData,
  error,
}: {
  workspacesData: Awaited<ReturnType<typeof requireOrganizationWorkspaces>> | null;
  error?: string;
}) {
  if (!workspacesData) {
    return (
      <main className={styles.page}>
        <ProjectsHeader />

        <section className={styles.content} aria-labelledby="projects-title">
          <div className="eyebrow">Your projects</div>
          <h1 id="projects-title">Projects are temporarily unavailable</h1>
          <p className={styles.intro}>
            Visitoring couldn’t reach its account service, so your projects couldn’t load. Please
            try again shortly.
          </p>
          <p>
            <Link href="/projects" className="button buttonPrimary">
              Try again
            </Link>
          </p>
        </section>
      </main>
    );
  }

  const { organizationId, organizations, canManageProjects, workspaces } = workspacesData;

  return (
    <main className={styles.page}>
      <ProjectsHeader>
        <div className={styles.organization}>
          <OrganizationSwitcher
            organizations={organizations}
            currentOrganizationId={organizationId}
            action={selectOrganizationAction}
          />
        </div>
        {canManageProjects ? (
          <Link href="/organization/admin" className="button buttonQuiet">
            Admin
          </Link>
        ) : null}
      </ProjectsHeader>

      <section className={styles.content} aria-labelledby="projects-title">
        <div className="eyebrow">Your projects</div>
        <h1 id="projects-title">Choose a project</h1>
        <p className={styles.intro}>Open a Visitoring project to view its sites and analytics.</p>

        {error === "access" ? (
          <p className={styles.error} role="alert">
            That project is no longer available to your account. Choose another project or ask an
            administrator for access.
          </p>
        ) : null}

        {error === "forbidden" ? (
          <p className={styles.error} role="alert">
            Only organization owners and admins can manage Visitoring projects.
          </p>
        ) : null}

        {workspaces.length > 0 ? (
          <div className={styles.grid}>
            {workspaces.map((workspace) => (
              <form action={selectWorkspaceAction} key={workspace.id}>
                <input type="hidden" name="workspaceId" value={workspace.id} />
                <button type="submit" className={styles.card}>
                  <span className={styles.cardTop}>
                    <span className={styles.projectIcon} aria-hidden>
                      {workspace.name.slice(0, 1).toUpperCase()}
                    </span>
                    <span className={styles.role}>{workspace.role}</span>
                  </span>
                  <span className={styles.projectName}>{workspace.name}</span>
                  <span className={styles.cardBottom}>
                    Open project <span aria-hidden>↗</span>
                  </span>
                </button>
              </form>
            ))}
          </div>
        ) : (
          <div className={styles.empty}>
            <h2>No accessible projects</h2>
            <p>
              {canManageProjects
                ? "Open organization administration to create, restore, or manage Visitoring projects."
                : "Your account is signed in, but it does not have access to a Visitoring project in this organization. Ask an administrator to grant access."}
            </p>
          </div>
        )}
      </section>
    </main>
  );
}
