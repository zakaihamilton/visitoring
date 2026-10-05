"use client";

import { useActionState } from "react";
import {
  createSiteAction,
  rotateSiteKeyAction,
  updateDomainsAction,
  type SiteActionState,
} from "./actions";
import styles from "./sites.module.css";

const initialState: SiteActionState = { message: "" };

function KeyNotice({ state }: { state: SiteActionState }) {
  if (!state.message) return null;
  return (
    <div className={state.error ? styles.error : styles.success} role="status">
      <p>{state.message}</p>
      {state.key ? <code>{state.key}</code> : null}
    </div>
  );
}

export function CreateSiteForm() {
  const [state, action, pending] = useActionState(createSiteAction, initialState);
  return (
    <form action={action} className={styles.createForm}>
      <label>
        Site name
        <input name="name" required maxLength={120} placeholder="Marketing site" />
      </label>
      <label>
        Website addresses
        <input name="domains" required placeholder="example.com, www.example.com" />
        <small>
          List each address that will use this tracker. Include www if your site uses it.
        </small>
      </label>
      <button type="submit" className="button buttonPrimary" disabled={pending}>
        {pending ? "Creating…" : "Add site"}
      </button>
      <KeyNotice state={state} />
    </form>
  );
}

export function SiteControls({ siteId, domains }: { siteId: string; domains: string[] }) {
  const [state, action, pending] = useActionState(rotateSiteKeyAction, initialState);
  return (
    <div className={styles.siteControls}>
      <form action={updateDomainsAction} className={styles.domainForm}>
        <input type="hidden" name="siteId" value={siteId} />
        <label>
          Website addresses
          <input name="domains" required defaultValue={domains.join(", ")} />
          <small>List each address that should be able to send data from this site.</small>
        </label>
        <button type="submit" className="button buttonQuiet">
          Save addresses
        </button>
      </form>
      <form action={action}>
        <input type="hidden" name="siteId" value={siteId} />
        <button type="submit" className="button buttonDanger" disabled={pending}>
          {pending ? "Replacing…" : "Replace tracking key"}
        </button>
        <p className={styles.keyWarning}>Replacing the key stops the old tracker from working.</p>
        <KeyNotice state={state} />
      </form>
    </div>
  );
}
