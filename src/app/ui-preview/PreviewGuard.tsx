"use client";

import type { MouseEvent, ReactNode } from "react";

function blockLinkNavigation(event: MouseEvent<HTMLDivElement>) {
  const target = event.target;
  if (target instanceof Element && target.closest("a")) {
    event.preventDefault();
    event.stopPropagation();
  }
}

// Production links and forms target real routes. Keep this fixture sandbox local.
export function PreviewGuard({ children }: { children: ReactNode }) {
  return (
    <div
      onClickCapture={blockLinkNavigation}
      onAuxClickCapture={blockLinkNavigation}
      onContextMenuCapture={blockLinkNavigation}
      onSubmitCapture={(event) => {
        event.preventDefault();
        event.stopPropagation();
      }}
    >
      {children}
    </div>
  );
}
