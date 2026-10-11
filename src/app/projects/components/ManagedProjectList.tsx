import type { ManagedProject } from "../project-types";
import { ProjectControls } from "./ProjectControls";
import styles from "../projects.module.css";

export function ManagedProjectList({
  title,
  projects,
  emptyMessage,
  archived = false,
}: {
  title: string;
  projects: ManagedProject[];
  emptyMessage: string;
  archived?: boolean;
}) {
  const titleId = archived ? "archived-projects-title" : "active-projects-title";

  return (
    <section aria-labelledby={titleId}>
      <h3 id={titleId}>{title}</h3>
      {projects.length ? (
        <ul className={styles.projectList}>
          {projects.map((project) => (
            <li className={styles.managedProject} key={project.id}>
              <div>
                <strong>{project.name}</strong>
                <span>
                  {archived
                    ? project.deletionPendingAt
                      ? "Access cleanup is pending. Analytics remain retained."
                      : "Tracking is paused. Analytics are retained."
                    : "Analytics and tracking are active."}
                </span>
              </div>
              <ProjectControls project={project} />
            </li>
          ))}
        </ul>
      ) : (
        <p className={styles.managerEmpty}>{emptyMessage}</p>
      )}
    </section>
  );
}
