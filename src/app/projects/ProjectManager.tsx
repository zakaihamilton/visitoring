"use client";

import { useActionState, useEffect, useId, useRef, useState } from "react";
import { guardConfirmableSubmit } from "@/app/components/confirmable-form";
import {
  createProjectAction,
  manageProjectAction,
  type ProjectActionState,
} from "./manage-actions";
import styles from "./projects.module.css";

type ManagedProject = {
  id: string;
  name: string;
  archivedAt: string | null;
  deletionPendingAt: string | null;
};

const initialState: ProjectActionState = { message: "" };

function Notice({ state }: { state: ProjectActionState }) {
  if (!state.message) return null;
  return (
    <p
      className={state.error ? styles.actionError : styles.actionSuccess}
      role={state.error ? "alert" : "status"}
    >
      {state.message}
    </p>
  );
}

function ProjectControls({ project }: { project: ManagedProject }) {
  const [state, action, pending] = useActionState(manageProjectAction, initialState);
  const [confirmOpen, setConfirmOpen] = useState(false);
  const dialogRef = useRef<HTMLDialogElement>(null);
  const cancelRef = useRef<HTMLButtonElement>(null);
  const confirmedRef = useRef(false);
  const formId = useId();

  useEffect(() => {
    const dialog = dialogRef.current;
    if (!dialog) return;
    if (confirmOpen && !dialog.open) {
      dialog.showModal();
      cancelRef.current?.focus();
    }
    if (!confirmOpen && dialog.open) dialog.close();
  }, [confirmOpen]);

  return (
    <div className={styles.projectControls}>
      {project.archivedAt ? (
        project.deletionPendingAt ? (
          <p className={styles.pendingDelete}>
            Deletion is pending. The project cannot be restored until cleanup finishes.
          </p>
        ) : (
          <form action={action}>
            <input type="hidden" name="workspaceId" value={project.id} />
            <input type="hidden" name="operation" value="restore" />
            <button type="submit" className="button buttonQuiet" disabled={pending}>
              {pending ? "Restoring…" : "Restore project"}
            </button>
          </form>
        )
      ) : (
        <form action={action}>
          <input type="hidden" name="workspaceId" value={project.id} />
          <input type="hidden" name="operation" value="archive" />
          <button type="submit" className="button buttonQuiet" disabled={pending}>
            {pending ? "Archiving…" : "Archive project"}
          </button>
        </form>
      )}

      {project.archivedAt ? (
        <>
          <form
            id={formId}
            action={action}
            onSubmit={(event) => guardConfirmableSubmit(event, confirmedRef, setConfirmOpen)}
          >
            <input type="hidden" name="workspaceId" value={project.id} />
            <input type="hidden" name="operation" value="delete" />
            <button type="submit" className="button buttonDanger" disabled={pending}>
              {pending
                ? "Deleting…"
                : project.deletionPendingAt
                  ? "Retry deletion"
                  : "Delete permanently"}
            </button>
          </form>
          <dialog
            ref={dialogRef}
            className={`confirmationDialogSurface ${styles.confirmDialog}`}
            aria-labelledby={`delete-project-title-${project.id}`}
            aria-describedby={`delete-project-description-${project.id}`}
            onCancel={(event) => {
              event.preventDefault();
              setConfirmOpen(false);
            }}
            onClose={() => setConfirmOpen(false)}
          >
            <h3 id={`delete-project-title-${project.id}`}>Delete {project.name} permanently?</h3>
            <p id={`delete-project-description-${project.id}`}>
              This permanently removes the project, its sites, tracking keys, and analytics. This
              cannot be undone.
            </p>
            <div className={styles.confirmActions}>
              <button
                type="button"
                className="button buttonQuiet"
                ref={cancelRef}
                onClick={() => setConfirmOpen(false)}
              >
                Cancel
              </button>
              <button
                type="submit"
                form={formId}
                className="button buttonDanger"
                disabled={pending}
                onClick={() => {
                  confirmedRef.current = true;
                }}
              >
                Delete permanently
              </button>
            </div>
          </dialog>
        </>
      ) : null}
      <Notice state={state} />
    </div>
  );
}

export function ProjectManager({ projects }: { projects: ManagedProject[] }) {
  const [state, action, pending] = useActionState(createProjectAction, initialState);
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

      <form action={action} className={styles.createProjectForm}>
        <div>
          <label htmlFor="new-project-name">Project name</label>
          <input
            id="new-project-name"
            name="name"
            required
            maxLength={120}
            placeholder="ShiftingFront"
          />
        </div>
        <button type="submit" className="button buttonPrimary" disabled={pending}>
          {pending ? "Adding…" : "Add project"}
        </button>
        <Notice state={state} />
      </form>

      <div className={styles.managedProjects}>
        <section aria-labelledby="active-projects-title">
          <h3 id="active-projects-title">Active projects</h3>
          {active.length ? (
            <ul className={styles.projectList}>
              {active.map((project) => (
                <li className={styles.managedProject} key={project.id}>
                  <div>
                    <strong>{project.name}</strong>
                    <span>Analytics and tracking are active.</span>
                  </div>
                  <ProjectControls project={project} />
                </li>
              ))}
            </ul>
          ) : (
            <p className={styles.managerEmpty}>No active projects yet.</p>
          )}
        </section>

        <section aria-labelledby="archived-projects-title">
          <h3 id="archived-projects-title">Archived projects</h3>
          {archived.length ? (
            <ul className={styles.projectList}>
              {archived.map((project) => (
                <li className={styles.managedProject} key={project.id}>
                  <div>
                    <strong>{project.name}</strong>
                    <span>
                      {project.deletionPendingAt
                        ? "Access cleanup is pending. Analytics remain retained."
                        : "Tracking is paused. Analytics are retained."}
                    </span>
                  </div>
                  <ProjectControls project={project} />
                </li>
              ))}
            </ul>
          ) : (
            <p className={styles.managerEmpty}>Archived projects will appear here.</p>
          )}
        </section>
      </div>
    </section>
  );
}
