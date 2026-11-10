"use client";

import { useActionState } from "react";
import { selectProjectAction } from "../actions";
import { createProjectAction, type ProjectActionState } from "../manage-actions";
import styles from "../projects.module.css";
import { initialState } from "./initialState";
import { ProjectNotice } from "./ProjectNotice";

export function CreateProjectForm({
  initialActionState = initialState,
}: {
  initialActionState?: ProjectActionState;
}) {
  const [state, action, pending] = useActionState(createProjectAction, initialActionState);

  return (
    <div className={styles.createProjectSection}>
      <form action={action} className={styles.createProjectForm}>
        <div>
          <label htmlFor="new-project-name">Project name</label>
          <input id="new-project-name" name="name" required maxLength={120} />
        </div>
        <button type="submit" className="button buttonPrimary" disabled={pending}>
          {pending ? "Adding…" : "Add project"}
        </button>
      </form>
      {state.message || state.createdProjectId ? (
        <div className={styles.projectCreateFeedback}>
          <ProjectNotice state={state} />
          {state.createdProjectId ? (
            <form action={selectProjectAction}>
              <input type="hidden" name="projectId" value={state.createdProjectId} />
              <button type="submit" className="button buttonPrimary">
                Open new project
              </button>
            </form>
          ) : null}
        </div>
      ) : null}
    </div>
  );
}
