"use client";

import { useActionState, useEffect, useRef, useState } from "react";
import { DropdownSelect } from "@/app/components/DropdownSelect";
import { createUserAction } from "../actions";
import { ActionFeedback } from "./ActionFeedback";
import { initialState } from "./initialState";
import styles from "../users.module.css";

export function CreateUserForm() {
  const [state, action, pending] = useActionState(createUserAction, initialState);
  const formRef = useRef<HTMLFormElement>(null);
  const pendingRef = useRef(false);
  const [role, setRole] = useState<"admin" | "viewer">("viewer");

  useEffect(() => {
    if (pendingRef.current && !pending && !state.error && state.message) {
      formRef.current?.reset();
      setRole("viewer");
    }
    pendingRef.current = pending;
  }, [pending, state.error, state.message]);

  return (
    <form action={action} className={styles.createForm} ref={formRef}>
      <div className={styles.field}>
        <label htmlFor="new-user-email">Email</label>
        <input
          id="new-user-email"
          name="email"
          type="email"
          required
          maxLength={254}
          autoComplete="off"
          placeholder="person@example.com"
        />
      </div>
      <div className={styles.field}>
        <label htmlFor="new-user-password">Initial password</label>
        <input
          id="new-user-password"
          name="password"
          type="password"
          required
          minLength={15}
          maxLength={256}
          autoComplete="new-password"
          aria-describedby="new-user-password-help"
        />
        <small id="new-user-password-help" className={styles.helpText}>
          At least 15 characters. Existing Perminister accounts keep their current password.
        </small>
      </div>
      <div className={styles.field}>
        <label htmlFor="new-user-role">Role</label>
        <DropdownSelect
          id="new-user-role"
          name="role"
          value={role}
          onChange={(event) => setRole(event.currentTarget.value as "admin" | "viewer")}
        >
          <option value="viewer">Viewer</option>
          <option value="admin">Admin</option>
        </DropdownSelect>
      </div>
      <button type="submit" className="button buttonPrimary" disabled={pending}>
        {pending ? "Adding…" : "Add user"}
      </button>
      <div className={styles.formFeedback}>
        <ActionFeedback state={state} />
      </div>
    </form>
  );
}
