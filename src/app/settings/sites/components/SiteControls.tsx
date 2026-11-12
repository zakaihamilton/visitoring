"use client";

import { useActionState, useRef, useState, type RefObject } from "react";
import { AlertDialog } from "panel-frame-ui";
import { guardConfirmableSubmit } from "@/app/components/confirmable-form";
import { Tooltip } from "@/app/components/Tooltip";
import { deleteSiteAction, rotateSiteKeyAction, updateDomainsAction } from "@/app/sites/actions";
import styles from "../../settings-page.module.css";
import { ActionNotice } from "./ActionNotice";
import { initialState } from "./initialState";

function ConfirmationActions({
  cancelButtonRef,
  confirmLabel,
  disabled,
  onCancel,
  onConfirm,
}: {
  cancelButtonRef: RefObject<HTMLButtonElement | null>;
  confirmLabel: string;
  disabled: boolean;
  onCancel: () => void;
  onConfirm: () => void;
}) {
  return (
    <div className={styles.confirmActions}>
      <button
        type="button"
        className="button buttonQuiet"
        ref={cancelButtonRef}
        onClick={onCancel}
      >
        Cancel
      </button>
      <button
        type="submit"
        className="button buttonDanger"
        disabled={disabled}
        onClick={onConfirm}
      >
        {confirmLabel}
      </button>
    </div>
  );
}

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
  const cancelButtonRef = useRef<HTMLButtonElement>(null);
  const confirmedRef = useRef(false);
  const [deleteState, deleteAction, deleting] = useActionState(deleteSiteAction, initialState);
  const [deleteConfirmOpen, setDeleteConfirmOpen] = useState(false);
  const deleteCancelButtonRef = useRef<HTMLButtonElement>(null);
  const confirmedDeleteRef = useRef(false);
  const [domainState, domainAction, savingDomains] = useActionState(
    updateDomainsAction,
    initialState,
  );
  const domainId = `site-domains-${siteId}`;

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
        <AlertDialog
          description="The current key will stop working immediately. You’ll need to update the tracker on your site with the new key."
          initialFocusRef={cancelButtonRef}
          onOpenChange={setConfirmOpen}
          open={confirmOpen}
          title="Replace tracking key?"
        >
          <ConfirmationActions
            cancelButtonRef={cancelButtonRef}
            confirmLabel="Replace key"
            disabled={pending}
            onCancel={() => setConfirmOpen(false)}
            onConfirm={() => {
              confirmedRef.current = true;
            }}
          />
        </AlertDialog>
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
        <AlertDialog
          description="This permanently removes the site's tracking key, collected events, and rate-limit history. This action can't be undone."
          initialFocusRef={deleteCancelButtonRef}
          onOpenChange={setDeleteConfirmOpen}
          open={deleteConfirmOpen}
          title={`Delete ${siteName}?`}
        >
          <ConfirmationActions
            cancelButtonRef={deleteCancelButtonRef}
            confirmLabel="Delete site"
            disabled={deleting}
            onCancel={() => setDeleteConfirmOpen(false)}
            onConfirm={() => {
              confirmedDeleteRef.current = true;
            }}
          />
        </AlertDialog>
      </form>
    </div>
  );
}
