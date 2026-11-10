"use client";

import { useActionState, useEffect, useRef, useState } from "react";
import { guardConfirmableSubmit } from "@/app/components/confirmable-form";
import { Tooltip } from "@/app/components/Tooltip";
import { deleteSiteAction, rotateSiteKeyAction, updateDomainsAction } from "@/app/sites/actions";
import dialogStyles from "../../confirm-dialog.module.css";
import styles from "../../settings-page.module.css";
import { ActionNotice } from "./ActionNotice";
import { initialState } from "./initialState";

export function SiteControls({
  siteId,
  siteName,
  domains,
}: {
  siteId: string;
  siteName: string;
  domains: string[];
}) {
  const [state, action, pending] = useActionState(rotateSiteKeyAction, initialState);
  const [confirmOpen, setConfirmOpen] = useState(false);
  const dialogRef = useRef<HTMLDialogElement>(null);
  const cancelButtonRef = useRef<HTMLButtonElement>(null);
  const confirmedRef = useRef(false);
  const [deleteState, deleteAction, deleting] = useActionState(deleteSiteAction, initialState);
  const [deleteConfirmOpen, setDeleteConfirmOpen] = useState(false);
  const deleteDialogRef = useRef<HTMLDialogElement>(null);
  const deleteCancelButtonRef = useRef<HTMLButtonElement>(null);
  const confirmedDeleteRef = useRef(false);
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

  useEffect(() => {
    const dialog = deleteDialogRef.current;
    if (!dialog) return;
    if (deleteConfirmOpen && !dialog.open) {
      dialog.showModal();
      deleteCancelButtonRef.current?.focus();
    }
    if (!deleteConfirmOpen && dialog.open) dialog.close();
  }, [deleteConfirmOpen]);

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
      <form
        action={deleteAction}
        className={styles.deleteActions}
        data-preview-confirmable="true"
        onSubmit={(event) =>
          guardConfirmableSubmit(event, confirmedDeleteRef, setDeleteConfirmOpen)
        }
      >
        <input type="hidden" name="siteId" value={siteId} />
        <button type="submit" className="button buttonDanger" disabled={deleting}>
          {deleting ? "Deleting…" : "Delete site"}
        </button>
        <ActionNotice state={deleteState} />
        <dialog
          ref={deleteDialogRef}
          className="confirmationDialogSurface"
          aria-labelledby={`delete-site-title-${siteId}`}
          aria-describedby={`delete-site-description-${siteId}`}
          onCancel={(event) => {
            event.preventDefault();
            setDeleteConfirmOpen(false);
          }}
          onClose={() => setDeleteConfirmOpen(false)}
        >
          <h3
            id={`delete-site-title-${siteId}`}
            className={`${dialogStyles.title} ${styles.confirmTitle}`}
          >
            Delete {siteName}?
          </h3>
          <p id={`delete-site-description-${siteId}`} className={dialogStyles.copy}>
            This permanently removes the site's tracking key, collected events, and rate-limit
            history. This action can't be undone.
          </p>
          <div className={`${dialogStyles.actions} ${styles.confirmActions}`}>
            <button
              type="button"
              className="button buttonQuiet"
              ref={deleteCancelButtonRef}
              onClick={() => setDeleteConfirmOpen(false)}
            >
              Cancel
            </button>
            <button
              type="submit"
              className="button buttonDanger"
              disabled={deleting}
              onClick={() => {
                confirmedDeleteRef.current = true;
              }}
            >
              Delete site
            </button>
          </div>
        </dialog>
      </form>
    </div>
  );
}
