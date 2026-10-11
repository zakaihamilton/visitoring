import type { SiteActionState } from "@/app/sites/actions";
import styles from "../../settings-page.module.css";

export function ActionNotice({ state }: { state: SiteActionState }) {
  if (!state.message) return null;
  return (
    <div
      className={state.error ? styles.error : styles.success}
      role={state.error ? "alert" : "status"}
    >
      <p>{state.message}</p>
      {state.key ? <code>{state.key}</code> : null}
    </div>
  );
}
