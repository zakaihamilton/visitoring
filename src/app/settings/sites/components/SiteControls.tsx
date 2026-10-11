"use client";

import { useActionState, useEffect, useRef, useState } from "react";
import { Tooltip } from "@/app/components/Tooltip";
import { guardConfirmableSubmit } from "@/app/components/confirmable-form";
import { rotateSiteKeyAction, updateDomainsAction } from "@/app/sites/actions";
import dialogStyles from "../../confirm-dialog.module.css";
import { ActionNotice } from "./ActionNotice";
import { initialState } from "./initialState";
import styles from "../../settings-page.module.css";

export function SiteControls({ siteId, domains }: { siteId: string; domains: string[] }) {
  const [state, action, pending] = useActionState(rotateSiteKeyAction, initialState);
  const [confirmOpen, setConfirmOpen] = useState(false);
  const dialogRef = useRef<HTMLDialogElement>(null);
  const cancelButtonRef = useRef<HTMLButtonElement>(null);
  const confirmedRef = useRef(false);
  const [domainState, domainAction, savingDomains] = useActionState(
    updateDomainsAction,
    initialState,
  );
  const domainId = `site-domains-${siteId}`;

  useEffect(() => {
    const dialog = dialogRef.current;
    if (!dialog) return;
    if (confirmOpen && !dialog.open) {
      dialog.showModal();
      cancelButtonRef.current?.focus();
    }
    if (!confirmOpen && dialog.open) dialog.close();
  }, [confirmOpen]);

  return (
    <div className={styles.siteControls}>
      <form action={domainAction} className={styles.domainForm}>
        <input type="hidden" name="siteId" value={siteId} />
        <div className={styles.field}>
          <div className={styles.labelRow}>
            <label htmlFor={domainId}>Approved website addresses</label>
            <Tooltip
              label="Approved website addresses"
              content="This site accepts tracking events only from the exact domains listed here. Separate addresses with commas."
            />
          </div>
          <input
            id={domainId}
            name="domains"
            required
            defaultValue={domains.join(", ")}
            aria-describedby={`${domainId}-hint`}
          />
          <small id={`${domainId}-hint`} className={styles.hint}>
            Include www or a local development port when your site uses one.
          </small>
        </div>
        <button type="submit" className="button buttonQuiet" disabled={savingDomains}>
          {savingDomains ? "Saving…" : "Save addresses"}
        </button>
        <ActionNotice state={domainState} />
      </form>
      <form
        action={action}
        className={styles.keyActions}
        onSubmit={(event) => guardConfirmableSubmit(event, confirmedRef, setConfirmOpen)}
      >
        <input type="hidden" name="siteId" value={siteId} />
        <div className={styles.keyActionLine}>
          <button type="submit" className="button buttonDanger" disabled={pending}>
            {pending ? "Replacing…" : "Replace tracking key"}
          </button>
          <Tooltip
            label="Replace tracking key"
            content="Replacing the key takes effect immediately. Update the tracker on this site with the new key."
          />
        </div>
        <p className={styles.keyWarning}>The old key stops working as soon as it is replaced.</p>
        <ActionNotice state={state} />
        <dialog
          ref={dialogRef}
          className="confirmationDialogSurface"
          aria-labelledby={`replace-key-title-${siteId}`}
          aria-describedby={`replace-key-description-${siteId}`}
          onCancel={(event) => {
            event.preventDefault();
            setConfirmOpen(false);
          }}
          onClose={() => setConfirmOpen(false)}
        >
          <h3
            id={`replace-key-title-${siteId}`}
            className={`${dialogStyles.title} ${styles.confirmTitle}`}
          >
            Replace tracking key?
          </h3>
          <p id={`replace-key-description-${siteId}`} className={dialogStyles.copy}>
            The current key will stop working immediately. You’ll need to update the tracker on your
            site with the new key.
          </p>
          <div className={`${dialogStyles.actions} ${styles.confirmActions}`}>
            <button
              type="button"
              className="button buttonQuiet"
              ref={cancelButtonRef}
              onClick={() => setConfirmOpen(false)}
            >
              Cancel
            </button>
            <button
              type="submit"
              className="button buttonDanger"
              disabled={pending}
              onClick={() => {
                confirmedRef.current = true;
              }}
            >
              Replace key
            </button>
          </div>
        </dialog>
      </form>
    </div>
  );
}
