import { useActionState, useEffect, useState } from "react";
import { DropdownSelect } from "@/app/components/DropdownSelect";
import { changeUserRoleAction } from "../actions";
import type { ManagedUser } from "../user-types";
import { ActionFeedback } from "./ActionFeedback";
import { initialState } from "./initialState";
import styles from "../users.module.css";

export function UserRoleForm({ user }: { user: ManagedUser }) {
  const [state, action, pending] = useActionState(changeUserRoleAction, initialState);
  const [role, setRole] = useState<"admin" | "viewer">(user.role);
  const roleId = `role-${user.id}`;

  useEffect(() => setRole(user.role), [user.role]);

  return (
    <form action={action} className={styles.roleForm}>
      <input type="hidden" name="userId" value={user.id} />
      <label className={styles.screenReaderOnly} htmlFor={roleId}>
        Role for {user.email ?? "account"}
      </label>
      <DropdownSelect
        id={roleId}
        name="role"
        value={role}
        onChange={(event) => setRole(event.currentTarget.value as "admin" | "viewer")}
        disabled={pending}
      >
        <option value="viewer">Viewer</option>
        <option value="admin">Admin</option>
      </DropdownSelect>
      <button type="submit" className="button buttonQuiet" disabled={pending || role === user.role}>
        {pending ? "Saving…" : "Save"}
      </button>
      <div className={styles.formFeedback}>
        <ActionFeedback state={state} />
      </div>
    </form>
  );
}
