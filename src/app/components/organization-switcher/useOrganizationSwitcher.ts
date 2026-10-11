import { useEffect, useId, useRef, useState } from "react";
import type { KeyboardEvent } from "react";
import type { VisitoringOrganizationChoice } from "@/lib/perminister";

export function useOrganizationSwitcher(
  organizations: VisitoringOrganizationChoice[],
  currentOrganizationId: string,
) {
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

  return {
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
  };
}
