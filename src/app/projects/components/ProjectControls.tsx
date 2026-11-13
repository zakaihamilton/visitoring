"use client";

import { useActionState, useId, useRef, useState } from "react";
import { AlertDialog } from "panel-frame-ui";
import { guardConfirmableSubmit } from "@/app/components/confirmable-form";
import { manageProjectAction } from "../manage-actions";
import type { ManagedProject } from "../project-types";
import { ProjectNotice } from "./ProjectNotice";
import { initialState } from "./initialState";
import styles from "../projects.module.css";

export function ProjectControls({ project }: { project: ManagedProject }) {
  const [state, action, pending] = useActionState(manageProjectAction, initialState);
  const [confirmOpen, setConfirmOpen] = useState(false);
  const cancelRef = useRef<HTMLButtonElement>(null);
  const confirmedRef = useRef(false);
  const formId = useId();

  return (
    <div className={styles.projectControls}>
      {project.archivedAt ? (
        project.deletionPendingAt ? (
          <p className={styles.pendingDelete}>
            Deletion is pending. The project cannot be restored until cleanup finishes.
          </p>
        ) : (
          <form action={action}>
            <input type="hidden" name="projectId" value={project.id} />
            <input type="hidden" name="operation" value="restore" />
            <button type="submit" className="button buttonQuiet" disabled={pending}>
              {pending ? "Restoring…" : "Restore project"}
            </button>
          </form>
        )
      ) : (
        <form action={action}>
          <input type="hidden" name="projectId" value={project.id} />
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
            <input type="hidden" name="projectId" value={project.id} />
            <input type="hidden" name="operation" value="delete" />
            <button type="submit" className="button buttonDanger" disabled={pending}>
              {pending
                ? "Deleting…"
                : project.deletionPendingAt
                  ? "Retry deletion"
                  : "Delete permanently"}
            </button>
          </form>
          <AlertDialog
            description="This permanently removes the project, its sites, tracking keys, and analytics. This cannot be undone."
            initialFocusRef={cancelRef}
            onOpenChange={setConfirmOpen}
            open={confirmOpen}
            title={`Delete ${project.name} permanently?`}
          >
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
          </AlertDialog>
        </>
      ) : null}
      <ProjectNotice state={state} />
    </div>
  );
}
