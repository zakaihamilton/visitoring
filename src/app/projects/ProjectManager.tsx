import type { ManagedProject } from "./project-types";
import { ManagedProjectList } from "./components/ManagedProjectList";
import { CreateProjectForm } from "./components/CreateProjectForm";
import styles from "./projects.module.css";

export function ProjectManager({ projects }: { projects: ManagedProject[] }) {
  const active = projects.filter((project) => !project.archivedAt);
  const archived = projects.filter((project) => project.archivedAt);

  return (
    <section className={styles.manager} aria-labelledby="manage-projects-title">
      <div className={styles.managerHeading}>
        <div>
          <div className="eyebrow">Organization administration</div>
          <h2 id="manage-projects-title">Manage Visitoring projects</h2>
          <p>Add a project for a website or product. You’ll be its first project admin.</p>
        </div>
      </div>

      <CreateProjectForm />

      <div className={styles.managedProjects}>
        <ManagedProjectList
          title="Active projects"
          projects={active}
          emptyMessage="No active projects yet."
        />
        <ManagedProjectList
          title="Archived projects"
          projects={archived}
          emptyMessage="Archived projects will appear here."
          archived
        />
      </div>
    </section>
  );
}
