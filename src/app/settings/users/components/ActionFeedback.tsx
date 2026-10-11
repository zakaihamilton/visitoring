import type { UserActionState } from "../actions";
import styles from "../users.module.css";

export function ActionFeedback({ state }: { state: UserActionState }) {
  if (!state.message) return null;
  return (
    <p
      className={state.error ? styles.errorMessage : styles.successMessage}
      role={state.error ? "alert" : "status"}
    >
      {state.message}
    </p>
  );
}
