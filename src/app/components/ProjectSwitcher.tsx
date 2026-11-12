"use client";

import Link from "next/link";
import { ContextSwitcher } from "panel-frame-ui";
import type { ProjectChoice } from "./project-switcher/useProjectSwitcher";
import styles from "./organization-switcher.module.css";

type Props = {
  projects?: ProjectChoice[];
  currentProjectId: string;
  currentProjectName: string;
  action: (formData: FormData) => void | Promise<void>;
};

export function ProjectSwitcher({ projects, currentProjectId, currentProjectName, action }: Props) {
  if (!projects || projects.length <= 1) {
    return (
      <Link href="/projects" className={styles.trigger} title="Switch project">
        <span className={styles.currentName}>{currentProjectName}</span>
      </Link>
    );
  }

  return (
    <form action={action} className={styles.form}>
      <ContextSwitcher
        className={styles.container}
        footer={
          <Link className="pf-select-footer-link" href="/projects">
            Manage projects…
          </Link>
        }
        id="visitoring-project-switcher"
        label="Project"
        name="projectId"
        options={projects.map((project) => ({ value: project.id, label: project.name }))}
        submitOnSelect
        value={currentProjectId}
      />
    </form>
  );
}
