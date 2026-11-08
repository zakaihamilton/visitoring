"use client";

import Link from "next/link";
import {
  useProjectSwitcher,
  type ProjectChoice,
} from "./project-switcher/useProjectSwitcher";
import styles from "./organization-switcher.module.css";
import listboxStyles from "./listbox.module.css";

type Props = {
  projects?: ProjectChoice[];
  currentProjectId: string;
  currentProjectName: string;
  action: (formData: FormData) => void | Promise<void>;
};

export function ProjectSwitcher({
  projects,
  currentProjectId,
  currentProjectName,
  action,
}: Props) {
  const choices =
    projects && projects.length > 0
      ? projects
      : [{ id: currentProjectId, name: currentProjectName }];

  const {
    currentIndex,
    currentProject,
    open,
    activeIndex,
    setOpen,
    setActiveIndex,
    openAt,
    handleKeyDown,
    containerRef,
    formRef,
    optionRefs,
    labelId,
    valueId,
    listboxId,
  } = useProjectSwitcher(choices, currentProjectId);

  // If there's only 1 or no choice array provided, render a clean link to /projects
  if (!projects || projects.length <= 1) {
    return (
      <Link href="/projects" className={styles.trigger} title="Switch project">
        <span className={styles.currentName}>{currentProjectName}</span>
      </Link>
    );
  }

  return (
    <form action={action} ref={formRef} className={styles.form}>
      <div className={styles.container} ref={containerRef}>
        <span id={labelId} className={styles.screenReaderOnly}>
          Project
        </span>
        <button
          type="button"
          role="combobox"
          aria-labelledby={`${labelId} ${valueId}`}
          aria-haspopup="listbox"
          aria-expanded={open}
          aria-controls={listboxId}
          aria-activedescendant={open ? `${listboxId}-option-${activeIndex}` : undefined}
          className={styles.trigger}
          title={currentProject?.name ?? currentProjectName}
          onClick={() => {
            if (open) setOpen(false);
            else openAt(currentIndex >= 0 ? currentIndex : 0);
          }}
          onKeyDown={handleKeyDown}
        >
          <span id={valueId} className={styles.currentName}>
            {currentProject?.name ?? currentProjectName}
          </span>
          <svg className={styles.chevron} aria-hidden="true" viewBox="0 0 12 12" fill="none">
            <path
              d="m3 4.5 3 3 3-3"
              stroke="currentColor"
              strokeWidth="1.5"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
          </svg>
        </button>
        <div
          id={listboxId}
          role="listbox"
          aria-labelledby={labelId}
          className={`${styles.options} ${listboxStyles.menu}`}
          hidden={!open}
        >
          {choices.map((project, index) => (
            <button
              id={`${listboxId}-option-${index}`}
              key={project.id}
              ref={(element) => {
                optionRefs.current[index] = element;
              }}
              type="submit"
              name="projectId"
              value={project.id}
              role="option"
              tabIndex={-1}
              aria-selected={project.id === currentProjectId}
              className={`${listboxStyles.option} ${
                index === activeIndex ? styles.activeOption : ""
              }`}
              onMouseEnter={() => setActiveIndex(index)}
              onClick={(event) => {
                if (project.id === currentProjectId) {
                  event.preventDefault();
                }
                setOpen(false);
              }}
            >
              <span>{project.name}</span>
              {project.id === currentProjectId ? <span aria-hidden="true">✓</span> : null}
            </button>
          ))}
          <Link
            href="/projects"
            className={`${listboxStyles.option}`}
            style={{
              borderTop: "1px solid var(--line)",
              marginTop: 4,
              paddingTop: 10,
              color: "var(--muted)",
            }}
            onClick={() => setOpen(false)}
          >
            <span>Manage projects…</span>
          </Link>
        </div>
      </div>
    </form>
  );
}
