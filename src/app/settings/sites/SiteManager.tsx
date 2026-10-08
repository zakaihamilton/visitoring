"use client";

import { useActionState, useEffect, useRef, useState } from "react";
import { Tooltip } from "@/app/components/Tooltip";
import {
  createSiteAction,
  rotateSiteKeyAction,
  updateDomainsAction,
  type SiteActionState,
} from "@/app/sites/actions";
import dialogStyles from "../confirm-dialog.module.css";
import styles from "../settings-page.module.css";

const initialState: SiteActionState = { message: "" };

function ActionNotice({ state }: { state: SiteActionState }) {
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

export function CreateSiteForm() {
  const [state, action, pending] = useActionState(createSiteAction, initialState);
  return (
    <form action={action} className={styles.formGrid}>
      <div className={styles.field}>
        <div className={styles.labelRow}>
          <label htmlFor="new-site-name">Site name</label>
          <Tooltip
            label="Site name"
            content="Choose a name that helps your team recognize this website in the dashboard."
          />
        </div>
        <input
          id="new-site-name"
          name="name"
          required
          maxLength={120}
          placeholder="Marketing site"
        />
      </div>
      <div className={styles.field}>
        <div className={styles.labelRow}>
          <label htmlFor="new-site-domains">Approved website addresses</label>
          <Tooltip
            label="Approved website addresses"
            content="Only events sent from these exact domains are accepted. Add each address once, separated by commas."
          />
        </div>
        <input
          id="new-site-domains"
          name="domains"
          required
          placeholder="example.com, www.example.com"
          aria-describedby="new-site-domains-hint"
        />
        <small id="new-site-domains-hint" className={styles.hint}>
          Include every version visitors use, such as both example.com and www.example.com.
        </small>
      </div>
      <button type="submit" className="button buttonPrimary" disabled={pending}>
        {pending ? "Adding…" : "Add site"}
      </button>
      <ActionNotice state={state} />
    </form>
  );
}

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
        onSubmit={(event) => {
          if (confirmedRef.current) {
            confirmedRef.current = false;
            setConfirmOpen(false);
            return;
          }
          event.preventDefault();
          setConfirmOpen(true);
        }}
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
          className={dialogStyles.dialog}
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
