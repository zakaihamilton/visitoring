import Link from "next/link";
import { asc, eq } from "drizzle-orm";
import { db } from "@/db";
import { workspaces as workspacesTable } from "@/db/schema";
import { BrandIcon } from "@/app/components/BrandIcon";
import { logoutAction } from "@/app/login/actions";
import { requireOrganizationWorkspaces } from "@/lib/auth";
import { ProjectManager } from "./ProjectManager";
import styles from "./projects.module.css";
import { selectWorkspaceAction } from "./actions";

export const dynamic = "force-dynamic";

type Props = { searchParams: Promise<{ error?: string }> };

export default async function ProjectsPage({ searchParams }: Props) {
  const [{ organizationId, organizationName, canManageProjects, workspaces }, { error }] =
    await Promise.all([requireOrganizationWorkspaces(), searchParams]);

  const managedProjects = canManageProjects
    ? await db
        .select({
          id: workspacesTable.id,
          name: workspacesTable.name,
          archivedAt: workspacesTable.archivedAt,
          deletionPendingAt: workspacesTable.deletionPendingAt,
        })
        .from(workspacesTable)
        .where(eq(workspacesTable.organizationId, organizationId))
        .orderBy(asc(workspacesTable.name))
    : [];
  const hasActiveManagedProjects = managedProjects.some((project) => !project.archivedAt);
  const hasArchivedManagedProjects = managedProjects.some((project) => project.archivedAt);
  const emptyState = canManageProjects
    ? hasActiveManagedProjects
      ? {
          title: "No accessible projects",
          message:
            "This organization has active projects, but your account does not have access to them. Ask a project admin to grant access, or add a project below.",
        }
      : hasArchivedManagedProjects
        ? {
            title: "No active projects",
            message:
              "Restore an archived project below or add a new project to start using analytics.",
          }
        : {
            title: "No projects yet",
            message: "Create a project below to start using Visitoring analytics.",
          }
    : {
        title: "No accessible projects",
        message:
          "Your account is signed in, but it does not have access to a Visitoring project in this organization. Ask an administrator to grant access.",
      };

  return (
    <main className={styles.page}>
      <header className={styles.header}>
        <Link href="/projects" className={styles.brand}>
          <BrandIcon />
          <span>Visitoring</span>
        </Link>
        <div className={styles.account}>
          <div className={styles.organization}>
            <span className={styles.organizationLabel}>Organization</span>
            <strong>{organizationName}</strong>
          </div>
          <form action={logoutAction}>
            <button type="submit" className="button buttonQuiet">
              Sign out
            </button>
          </form>
        </div>
      </header>

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
            <h2>{emptyState.title}</h2>
            <p>{emptyState.message}</p>
          </div>
        )}

        {canManageProjects ? (
          <ProjectManager
            projects={managedProjects.map((project) => ({
              ...project,
              archivedAt: project.archivedAt?.toISOString() ?? null,
              deletionPendingAt: project.deletionPendingAt?.toISOString() ?? null,
            }))}
          />
        ) : null}
      </section>
    </main>
  );
}
