import Link from "next/link";
import type { requireOrganizationProjects } from "@/lib/auth";
import { selectProjectAction } from "./actions";
import styles from "./projects.module.css";

export function ProjectsView({
  projectsData,
  error,
}: {
  projectsData: Awaited<ReturnType<typeof requireOrganizationProjects>> | null;
  error?: string;
}) {
  if (!projectsData) {
    return (
      <main className={styles.page}>
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

  const { organizationId, organizations, canManageProjects, projects } = projectsData;

  return (
    <main className={styles.page}>
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

        {projects.length > 0 ? (
          <div className={styles.grid}>
            {projects.map((project) => (
              <form action={selectProjectAction} key={project.id}>
                <input type="hidden" name="projectId" value={project.id} />
                <button type="submit" className={styles.card}>
                  <span className={styles.cardTop}>
                    <span className={styles.projectIcon} aria-hidden>
                      {project.name.slice(0, 1).toUpperCase()}
                    </span>
                    <span className={styles.role}>{project.role}</span>
                  </span>
                  <span className={styles.projectName}>{project.name}</span>
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
