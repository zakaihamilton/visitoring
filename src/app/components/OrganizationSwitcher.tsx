"use client";

import { ContextSwitcher } from "panel-frame-ui";
import type { VisitoringOrganizationChoice } from "@/lib/perminister";
import styles from "./organization-switcher.module.css";

type Props = {
  organizations: VisitoringOrganizationChoice[];
  currentOrganizationId: string;
  action: (formData: FormData) => void | Promise<void>;
};

export function OrganizationSwitcher({ organizations, currentOrganizationId, action }: Props) {
  return (
    <form action={action} className={styles.form}>
      <ContextSwitcher
        className={styles.container}
        id="visitoring-organization-switcher"
        label="Organization"
        name="organizationId"
        options={organizations.map((organization) => ({
          value: organization.organizationId,
          label: organization.organizationName,
        }))}
        submitOnSelect
        value={currentOrganizationId}
      />
    </form>
  );
}
