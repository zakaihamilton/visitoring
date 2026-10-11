import { useActionState, useEffect, useId, useRef, useState } from "react";
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
  const dialogRef = useRef<HTMLDialogElement>(null);
  const formRef = useRef<HTMLFormElement>(null);
  const pendingRef = useRef(false);
  const id = useId();

  useEffect(() => {
    const dialog = dialogRef.current;
    if (!dialog) return;
    if (open && !dialog.open) dialog.showModal();
    if (!open && dialog.open) dialog.close();
  }, [open]);

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
      <dialog
        ref={dialogRef}
        className={dialogStyles.dialog}
        aria-labelledby={`${id}-title`}
        aria-describedby={`${id}-description`}
        onCancel={(event) => {
          event.preventDefault();
          closeDialog();
        }}
        onClose={() => setOpen(false)}
      >
        <form action={formAction} ref={formRef} className={styles.confirmDialogForm}>
          <input type="hidden" name="userId" value={user.id} />
          <h3 id={`${id}-title`} className={`${dialogStyles.title} ${styles.confirmTitle}`}>
            {title}
          </h3>
          <p id={`${id}-description`} className={dialogStyles.copy}>
            {description}
          </p>
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
      </dialog>
      {!open && showFeedback ? <ActionFeedback state={state} /> : null}
    </div>
  );
}
