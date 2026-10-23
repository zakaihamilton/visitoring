"use client";

import Link from "next/link";
import {
  useWorkspaceSwitcher,
  type WorkspaceChoice,
} from "./workspace-switcher/useWorkspaceSwitcher";
import styles from "./organization-switcher.module.css";
import listboxStyles from "./listbox.module.css";

type Props = {
  workspaces?: WorkspaceChoice[];
  currentWorkspaceId: string;
  currentWorkspaceName: string;
  action: (formData: FormData) => void | Promise<void>;
};

export function WorkspaceSwitcher({
  workspaces,
  currentWorkspaceId,
  currentWorkspaceName,
  action,
}: Props) {
  const choices =
    workspaces && workspaces.length > 0
      ? workspaces
      : [{ id: currentWorkspaceId, name: currentWorkspaceName }];

  const {
    currentIndex,
    currentWorkspace,
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
  } = useWorkspaceSwitcher(choices, currentWorkspaceId);

  // If there's only 1 or no choice array provided, render a clean link to /projects
  if (!workspaces || workspaces.length <= 1) {
    return (
      <Link href="/projects" className={styles.trigger} title="Switch project">
        <span className={styles.currentName}>{currentWorkspaceName}</span>
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
          title={currentWorkspace?.name ?? currentWorkspaceName}
          onClick={() => {
            if (open) setOpen(false);
            else openAt(currentIndex >= 0 ? currentIndex : 0);
          }}
          onKeyDown={handleKeyDown}
        >
          <span id={valueId} className={styles.currentName}>
            {currentWorkspace?.name ?? currentWorkspaceName}
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
          {choices.map((workspace, index) => (
            <button
              id={`${listboxId}-option-${index}`}
              key={workspace.id}
              ref={(element) => {
                optionRefs.current[index] = element;
              }}
              type="submit"
              name="workspaceId"
              value={workspace.id}
              role="option"
              tabIndex={-1}
              aria-selected={workspace.id === currentWorkspaceId}
              className={`${listboxStyles.option} ${
                index === activeIndex ? styles.activeOption : ""
              }`}
              onMouseEnter={() => setActiveIndex(index)}
              onClick={(event) => {
                if (workspace.id === currentWorkspaceId) {
                  event.preventDefault();
                }
                setOpen(false);
              }}
            >
              <span>{workspace.name}</span>
              {workspace.id === currentWorkspaceId ? (
                <span aria-hidden="true">✓</span>
              ) : null}
            </button>
          ))}
          <Link
            href="/projects"
            className={`${listboxStyles.option}`}
            style={{ borderTop: "1px solid var(--line)", marginTop: 4, paddingTop: 10, color: "var(--muted)" }}
            onClick={() => setOpen(false)}
          >
            <span>Manage projects…</span>
          </Link>
        </div>
      </div>
    </form>
  );
}
