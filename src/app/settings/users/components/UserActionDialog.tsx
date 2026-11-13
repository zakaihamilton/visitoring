"use client";

import { useActionState, useEffect, useId, useRef, useState } from "react";
import { Dialog } from "panel-frame-ui";
import type { UserAction } from "../user-types";
import type { ManagedUser } from "../user-types";
import dialogStyles from "../../confirm-dialog.module.css";
import styles from "../users.module.css";
import { ActionFeedback } from "./ActionFeedback";
import { initialState } from "./initialState";

export function UserActionDialog({
  action,
  user,
  triggerLabel,
  title,
  description,
  confirmLabel,
  tone,
  password = false,
}: {
  action: UserAction;
  user: ManagedUser;
  triggerLabel: string;
  title: string;
  description: string;
  confirmLabel: string;
  tone: "quiet" | "danger";
  password?: boolean;
}) {
  const [state, formAction, pending] = useActionState(action, initialState);
  const [open, setOpen] = useState(false);
  const [showFeedback, setShowFeedback] = useState(false);
  const formRef = useRef<HTMLFormElement>(null);
  const pendingRef = useRef(false);
  const id = useId();

  useEffect(() => {
    if (pendingRef.current && !pending) {
      setShowFeedback(true);
      if (!state.error && state.message) {
        formRef.current?.reset();
        setOpen(false);
      }
    }
    pendingRef.current = pending;
  }, [pending, state.error, state.message]);

  const closeDialog = () => {
    formRef.current?.reset();
    setOpen(false);
    setShowFeedback(false);
  };

  return (
    <div className={styles.actionDialogRoot}>
      <button
        type="button"
        className={`button ${tone === "danger" ? "buttonDanger" : "buttonQuiet"}`}
        aria-haspopup="dialog"
        onClick={() => {
          setShowFeedback(false);
          setOpen(true);
        }}
      >
        {triggerLabel}
      </button>
      <Dialog
        description={description}
        onOpenChange={(nextOpen) => {
          if (!nextOpen) closeDialog();
        }}
        open={open}
        title={title}
      >
        <form action={formAction} ref={formRef} className={styles.confirmDialogForm}>
          <input type="hidden" name="userId" value={user.id} />
          {password ? (
            <div className={`${styles.field} ${styles.dialogPassword}`}>
              <label htmlFor={`${id}-password`}>New password</label>
              <input
                id={`${id}-password`}
                name="password"
                type="password"
                required
                minLength={15}
                maxLength={256}
                autoComplete="new-password"
              />
              <small className={styles.helpText}>At least 15 characters.</small>
            </div>
          ) : null}
          {open && showFeedback ? <ActionFeedback state={state} /> : null}
          <div className={`${dialogStyles.actions} ${styles.confirmActions}`}>
            <button type="button" className="button buttonQuiet" onClick={closeDialog}>
              Cancel
            </button>
            <button
              type="submit"
              className={`button ${tone === "danger" ? "buttonDanger" : "buttonPrimary"}`}
              disabled={pending}
            >
              {pending ? "Saving…" : confirmLabel}
            </button>
          </div>
        </form>
      </Dialog>
      {!open && showFeedback ? <ActionFeedback state={state} /> : null}
    </div>
  );
}
