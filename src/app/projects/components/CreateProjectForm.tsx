"use client";

import { useActionState } from "react";
import { createProjectAction } from "../manage-actions";
import { ProjectNotice } from "./ProjectNotice";
import { initialState } from "./initialState";
import styles from "../projects.module.css";

export function CreateProjectForm() {
  const [state, action, pending] = useActionState(createProjectAction, initialState);

  return (
    <form action={action} className={styles.createProjectForm}>
      <div>
        <label htmlFor="new-project-name">Project name</label>
        <input id="new-project-name" name="name" required maxLength={120} />
      </div>
      <button type="submit" className="button buttonPrimary" disabled={pending}>
        {pending ? "Adding…" : "Add project"}
      </button>
      <ProjectNotice state={state} />
    </form>
  );
}
