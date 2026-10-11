"use client";

import { useActionState } from "react";
import { Tooltip } from "@/app/components/Tooltip";
import { createSiteAction } from "@/app/sites/actions";
import { ActionNotice } from "./ActionNotice";
import { initialState } from "./initialState";
import styles from "../../settings-page.module.css";

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
