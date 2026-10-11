import { useActionState } from "react";
import { reactivateUserAction } from "../actions";
import type { ManagedUser } from "../user-types";
import { ActionFeedback } from "./ActionFeedback";
import { initialState } from "./initialState";
import styles from "../users.module.css";

export function ReactivateUserForm({ user }: { user: ManagedUser }) {
  const [state, action, pending] = useActionState(reactivateUserAction, initialState);
  return (
    <form action={action} className={styles.inlineAction}>
      <input type="hidden" name="userId" value={user.id} />
      <button type="submit" className="button buttonQuiet" disabled={pending}>
        {pending ? "Restoring…" : "Reactivate"}
      </button>
      <ActionFeedback state={state} />
    </form>
  );
}
