import type { ProjectActionState } from "../manage-actions";
import styles from "../projects.module.css";

export function ProjectNotice({ state }: { state: ProjectActionState }) {
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
