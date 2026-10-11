"use client";

import { useCallback, useEffect, useId, useRef, useState } from "react";
import type { KeyboardEvent } from "react";
import type { VisitoringOrganizationChoice } from "@/lib/perminister";
import styles from "./organizations.module.css";

type Props = {
  organizations: VisitoringOrganizationChoice[];
  initialOrganizationId: string;
  action: (formData: FormData) => void | Promise<void>;
};

export function OrganizationPicker({ organizations, initialOrganizationId, action }: Props) {
  const [selectedId, setSelectedId] = useState(initialOrganizationId);
  const [activeIndex, setActiveIndex] = useState(() =>
    Math.max(
      0,
      organizations.findIndex(
        (organization) => organization.organizationId === initialOrganizationId,
      ),
    ),
  );
  const [open, setOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);
  const labelId = useId();
  const valueId = useId();
  const listboxId = useId();
  const selectedOrganization = organizations.find(
    (organization) => organization.organizationId === selectedId,
  );

  useEffect(() => {
    if (!open) return;
    function closeWhenOutside(event: PointerEvent) {
      if (event.target instanceof Node && !containerRef.current?.contains(event.target)) {
        setOpen(false);
      }
    }
    document.addEventListener("pointerdown", closeWhenOutside);
    return () => document.removeEventListener("pointerdown", closeWhenOutside);
  }, [open]);

  const scrollActiveOption = useCallback(
    (option: HTMLDivElement | null) => {
      if (open) option?.scrollIntoView?.({ block: "nearest" });
    },
    [open],
  );

  function openAt(index: number) {
    setActiveIndex(Math.min(Math.max(index, 0), organizations.length - 1));
    setOpen(true);
  }

  function selectActive() {
    const organization = organizations[activeIndex];
    if (!organization) return;
    setSelectedId(organization.organizationId);
    setOpen(false);
  }

  function handleKeyDown(event: KeyboardEvent<HTMLButtonElement>) {
    if (event.key === "Escape" && open) {
      event.preventDefault();
      setOpen(false);
      return;
    }
    if (event.key === "Tab" && open) {
      setOpen(false);
      return;
    }

    if (event.key === "ArrowDown" || event.key === "ArrowUp") {
      event.preventDefault();
      if (!open) {
        const selectedIndex = organizations.findIndex(
          (organization) => organization.organizationId === selectedId,
        );
        openAt(
          selectedIndex >= 0
            ? selectedIndex
            : event.key === "ArrowDown"
              ? 0
              : organizations.length - 1,
        );
      } else {
        const direction = event.key === "ArrowDown" ? 1 : -1;
        setActiveIndex(
          (index) => (index + direction + organizations.length) % organizations.length,
        );
      }
      return;
    }
    if (event.key === "Home" || event.key === "End") {
      if (!open) return;
      event.preventDefault();
      setActiveIndex(event.key === "Home" ? 0 : organizations.length - 1);
      return;
    }
    if (event.key === "Enter" || event.key === " ") {
      event.preventDefault();
      if (open) selectActive();
      else {
        const selectedIndex = organizations.findIndex(
          (organization) => organization.organizationId === selectedId,
        );
        openAt(selectedIndex >= 0 ? selectedIndex : 0);
      }
    }
  }

  return (
    <form action={action} className={styles.selectionForm}>
      <div className={styles.pickerField} ref={containerRef}>
        <span id={labelId} className={styles.fieldLabel}>
          Organization
        </span>
        <input type="hidden" name="organizationId" value={selectedId} />
        <button
          type="button"
          role="combobox"
          aria-labelledby={`${labelId} ${valueId}`}
          aria-haspopup="listbox"
          aria-required="true"
          aria-expanded={open}
          aria-controls={listboxId}
          aria-activedescendant={open ? `${listboxId}-option-${activeIndex}` : undefined}
          className={styles.pickerTrigger}
          onClick={() => {
            if (open) setOpen(false);
            else {
              const selectedIndex = organizations.findIndex(
                (organization) => organization.organizationId === selectedId,
              );
              openAt(selectedIndex >= 0 ? selectedIndex : 0);
            }
          }}
          onKeyDown={handleKeyDown}
        >
          <span
            id={valueId}
            className={`${styles.triggerLabel} ${selectedOrganization ? "" : styles.placeholder}`}
          >
            {selectedOrganization?.organizationName ?? "Select an organization"}
          </span>
          <span className={styles.chevron} aria-hidden="true">
            {open ? "⌃" : "⌄"}
          </span>
        </button>
        <div
          id={listboxId}
          role="listbox"
          aria-labelledby={labelId}
          className={styles.options}
          hidden={!open}
        >
          {organizations.map((organization, index) => (
            <div
              id={`${listboxId}-option-${index}`}
              key={organization.organizationId}
              ref={index === activeIndex ? scrollActiveOption : undefined}
              role="option"
              tabIndex={-1}
              aria-selected={organization.organizationId === selectedId}
              className={index === activeIndex ? styles.activeOption : styles.option}
              onMouseEnter={() => setActiveIndex(index)}
              onClick={() => {
                setSelectedId(organization.organizationId);
                setActiveIndex(index);
                setOpen(false);
              }}
              onKeyDown={(event) => {
                if (event.key === "Enter" || event.key === " ") {
                  event.preventDefault();
                  setSelectedId(organization.organizationId);
                  setActiveIndex(index);
                  setOpen(false);
                }
              }}
            >
              <span className={styles.optionName}>{organization.organizationName}</span>
              {organization.organizationId === selectedId ? (
                <span aria-hidden="true">✓</span>
              ) : null}
            </div>
          ))}
        </div>
      </div>
      <button
        type="submit"
        className={`button buttonPrimary ${styles.continue}`}
        disabled={!selectedId}
      >
        Continue <span aria-hidden="true">↗</span>
      </button>
    </form>
  );
}
