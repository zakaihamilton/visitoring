import Link from "next/link";
import { BrandIcon } from "@/app/components/BrandIcon";
import { OrganizationSwitcher } from "@/app/components/OrganizationSwitcher";
import { logoutAction } from "@/app/login/actions";
import { selectOrganizationAction } from "@/app/organizations/actions";
import { requireOrganizationWorkspaces } from "@/lib/auth";
import styles from "./projects.module.css";
import { selectWorkspaceAction } from "./actions";

export const dynamic = "force-dynamic";

type Props = { searchParams: Promise<{ error?: string }> };

export default async function ProjectsPage({ searchParams }: Props) {
  const [{ organizationId, organizations, canManageProjects, workspaces }, { error }] =
    await Promise.all([requireOrganizationWorkspaces(), searchParams]);

  return (
    <main className={styles.page}>
      <header className={styles.header}>
        <Link href="/projects" className={styles.brand}>
          <BrandIcon />
          <span>Visitoring</span>
        </Link>
        <div className={styles.account}>
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
