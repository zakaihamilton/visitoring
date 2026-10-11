"use client";

import { useId } from "react";
import { createPortal } from "react-dom";
import { useTooltipInteractions } from "./tooltip/useTooltipInteractions";
import { useTooltipPosition } from "./tooltip/useTooltipPosition";
import styles from "./tooltip.module.css";

type TooltipProps = {
  content: string;
  label: string;
  children?: React.ReactNode;
  targetElement?: "span" | "div";
  targetClassName?: string;
  targetRole?: "img";
  targetAriaLabel?: string;
  targetTabIndex?: number;
};

export function Tooltip({
  content,
  label,
  children,
  targetElement = "span",
  targetClassName,
  targetRole,
  targetAriaLabel,
  targetTabIndex = 0,
}: TooltipProps) {
  const id = useId().replaceAll(":", "");
  const { triggerRef, bubbleRef, visible, hoverHandlers, triggerHandlers } =
    useTooltipInteractions(id);
  const position = useTooltipPosition(visible, triggerRef, bubbleRef);

  const tooltipBubble =
    visible && typeof document !== "undefined"
      ? createPortal(
          <span
            className={styles.bubble}
            ref={bubbleRef}
            role="tooltip"
            aria-hidden="true"
            {...hoverHandlers}
            style={{
              left: position.left,
              top: position.top,
              ...(position.width === undefined ? {} : { width: position.width }),
              ...(position.maxHeight === undefined ? {} : { maxHeight: position.maxHeight }),
              visibility: position.ready ? "visible" : "hidden",
            }}
          >
            {content}
          </span>,
          document.body,
        )
      : null;

  const Trigger = targetElement;

  return (
    <>
      {children === undefined ? (
        <button
          {...triggerHandlers}
          type="button"
          className={styles.helpButton}
          aria-label={`Help: ${label}`}
          title={visible && position.ready ? undefined : content}
        >
          <span aria-hidden="true">i</span>
        </button>
      ) : (
        <Trigger
          {...triggerHandlers}
          className={`${styles.target} ${targetClassName ?? ""}`}
          tabIndex={targetTabIndex}
          {...(targetRole ? { role: targetRole, "aria-label": targetAriaLabel } : {})}
        >
          {children}
        </Trigger>
      )}
      <span id={id} hidden>
        {content}
      </span>
      {tooltipBubble}
    </>
  );
}
