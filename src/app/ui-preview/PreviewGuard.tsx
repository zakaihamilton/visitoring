"use client";

import type { FormEvent, MouseEvent, ReactNode } from "react";

function blockLinkNavigation(event: MouseEvent<HTMLDivElement>) {
  const target = event.target;
  if (target instanceof Element && target.closest("a")) {
    event.preventDefault();
    event.stopPropagation();
  }
}

function blockFormSubmission(event: FormEvent<HTMLDivElement>) {
  const form = event.target;
  if (
    form instanceof HTMLFormElement &&
    form.dataset.previewConfirmable === "true" &&
    !form.querySelector("dialog[open]")
  ) {
    return;
  }
  event.preventDefault();
  event.stopPropagation();
}

// Production links and forms target real routes. Keep this fixture sandbox local.
export function PreviewGuard({ children }: { children: ReactNode }) {
  return (
    <div
      onClickCapture={blockLinkNavigation}
      onAuxClickCapture={blockLinkNavigation}
      onContextMenuCapture={blockLinkNavigation}
      onSubmitCapture={blockFormSubmission}
    >
      {children}
    </div>
  );
}
