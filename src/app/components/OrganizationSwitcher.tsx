"use client";

import { useEffect, useId, useRef, useState } from "react";
import type { KeyboardEvent } from "react";
import type { VisitoringOrganizationChoice } from "@/lib/perminister";
import styles from "./organization-switcher.module.css";

type Props = {
  organizations: VisitoringOrganizationChoice[];
  currentOrganizationId: string;
  action: (formData: FormData) => void | Promise<void>;
};

export function OrganizationSwitcher({ organizations, currentOrganizationId, action }: Props) {
  const currentIndex = organizations.findIndex(
    (organization) => organization.organizationId === currentOrganizationId,
  );
  const [open, setOpen] = useState(false);
  const [activeIndex, setActiveIndex] = useState(Math.max(currentIndex, 0));
  const containerRef = useRef<HTMLDivElement>(null);
  const formRef = useRef<HTMLFormElement>(null);
  const optionRefs = useRef<Array<HTMLButtonElement | null>>([]);
  const labelId = useId();
  const valueId = useId();
  const listboxId = useId();
  const currentOrganization = organizations[currentIndex];

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

  useEffect(() => {
    if (open) optionRefs.current[activeIndex]?.scrollIntoView?.({ block: "nearest" });
  }, [activeIndex, open]);

  function openAt(index: number) {
    if (organizations.length === 0) return;
    setActiveIndex(Math.min(Math.max(index, 0), organizations.length - 1));
    setOpen(true);
  }

  function selectActive() {
    if (activeIndex === currentIndex) {
      setOpen(false);
      return;
    }
    const submitter = optionRefs.current[activeIndex];
    if (submitter) formRef.current?.requestSubmit(submitter);
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
    if (organizations.length === 0) return;

    if (event.key === "ArrowDown" || event.key === "ArrowUp") {
      event.preventDefault();
      if (!open) {
        openAt(
          currentIndex >= 0
            ? currentIndex
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
      else openAt(currentIndex >= 0 ? currentIndex : 0);
    }
  }

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
              className={index === activeIndex ? styles.activeOption : styles.option}
              onMouseEnter={() => setActiveIndex(index)}
              onClick={(event) => {
                if (organization.organizationId === currentOrganizationId) {
                  event.preventDefault();
                  setOpen(false);
                }
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
