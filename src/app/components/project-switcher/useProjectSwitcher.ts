"use client";

import { useEffect, useId, useRef, useState } from "react";
import type { KeyboardEvent } from "react";

export type ProjectChoice = {
  id: string;
  name: string;
};

export function useProjectSwitcher(projects: ProjectChoice[], currentProjectId: string) {
  const currentIndex = projects.findIndex((project) => project.id === currentProjectId);
  const [open, setOpen] = useState(false);
  const [activeIndex, setActiveIndex] = useState(Math.max(currentIndex, 0));
  const containerRef = useRef<HTMLDivElement>(null);
  const formRef = useRef<HTMLFormElement>(null);
  const optionRefs = useRef<Array<HTMLButtonElement | null>>([]);
  const labelId = useId();
  const valueId = useId();
  const listboxId = useId();
  const currentProject = projects[currentIndex];

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
    if (projects.length === 0) return;
    setActiveIndex(Math.min(Math.max(index, 0), projects.length - 1));
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
    if (projects.length === 0) return;

    if (event.key === "ArrowDown") {
      event.preventDefault();
      if (!open) openAt(currentIndex >= 0 ? currentIndex : 0);
      else setActiveIndex((index) => Math.min(index + 1, projects.length - 1));
      return;
    }

    if (event.key === "ArrowUp") {
      event.preventDefault();
      if (!open) openAt(currentIndex >= 0 ? currentIndex : 0);
      else setActiveIndex((index) => Math.max(index - 1, 0));
      return;
    }

    if (event.key === "Home" && open) {
      event.preventDefault();
      setActiveIndex(0);
      return;
    }

    if (event.key === "End" && open) {
      event.preventDefault();
      setActiveIndex(projects.length - 1);
      return;
    }

    if (event.key === "Enter" || event.key === " ") {
      event.preventDefault();
      if (!open) openAt(currentIndex >= 0 ? currentIndex : 0);
      else selectActive();
      return;
    }

    if (event.key === "Escape" && open) {
      event.preventDefault();
      setOpen(false);
    }
  }

  return {
    currentIndex,
    currentProject,
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
