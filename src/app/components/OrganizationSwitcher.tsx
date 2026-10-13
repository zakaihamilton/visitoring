"use client";

import type { VisitoringOrganizationChoice } from "@/lib/perminister";
import { useOrganizationSwitcher } from "./organization-switcher/useOrganizationSwitcher";
import styles from "./organization-switcher.module.css";
import listboxStyles from "./listbox.module.css";

type Props = {
  organizations: VisitoringOrganizationChoice[];
  currentOrganizationId: string;
  action: (formData: FormData) => void | Promise<void>;
};

export function OrganizationSwitcher({ organizations, currentOrganizationId, action }: Props) {
  const {
    currentIndex,
    currentOrganization,
    open,
    activeIndex,
    setOpen,
    setActiveIndex,
    openAt,
    handleKeyDown,
    containerRef,
    formRef,
    optionRefs,
    labelId,
    valueId,
    listboxId,
  } = useOrganizationSwitcher(organizations, currentOrganizationId);

  return (
    <form action={action} ref={formRef} className={styles.form}>
      <div className={styles.container} ref={containerRef}>
        <span id={labelId} className={styles.screenReaderOnly}>
          Organization
        </span>
        <button
          type="button"
          role="combobox"
          aria-labelledby={`${labelId} ${valueId}`}
          aria-haspopup="listbox"
          aria-expanded={open}
          aria-controls={listboxId}
          aria-activedescendant={open ? `${listboxId}-option-${activeIndex}` : undefined}
          className={styles.trigger}
          title={currentOrganization?.organizationName ?? "Choose organization"}
          onClick={() => {
            if (open) setOpen(false);
            else openAt(currentIndex >= 0 ? currentIndex : 0);
          }}
          onKeyDown={handleKeyDown}
        >
          <span id={valueId} className={styles.currentName}>
            {currentOrganization?.organizationName ?? "Choose organization"}
          </span>
          <svg className={styles.chevron} aria-hidden="true" viewBox="0 0 12 12" fill="none">
            <path
              d="m3 4.5 3 3 3-3"
              stroke="currentColor"
              strokeWidth="1.5"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
          </svg>
        </button>
        <div
          id={listboxId}
          role="listbox"
          aria-labelledby={labelId}
          className={`${styles.options} ${listboxStyles.menu}`}
          hidden={!open}
        >
          {organizations.map((organization, index) => (
            <button
              id={`${listboxId}-option-${index}`}
              key={organization.organizationId}
              ref={(element) => {
                optionRefs.current[index] = element;
              }}
              type="submit"
              name="organizationId"
              value={organization.organizationId}
              role="option"
              tabIndex={-1}
              aria-selected={organization.organizationId === currentOrganizationId}
              className={`${listboxStyles.option} ${
                index === activeIndex ? styles.activeOption : ""
              }`}
              onMouseEnter={() => setActiveIndex(index)}
              onClick={(event) => {
                if (organization.organizationId === currentOrganizationId) {
                  event.preventDefault();
                }
                setOpen(false);
              }}
            >
              <span>{organization.organizationName}</span>
              {organization.organizationId === currentOrganizationId ? (
                <span aria-hidden="true">✓</span>
              ) : null}
            </button>
          ))}
        </div>
      </div>
    </form>
  );
}
