"use client";

import { useCallback, useEffect, useId, useLayoutEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
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

type Position = { left: number; top: number; width?: number; ready: boolean };

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
  const triggerRef = useRef<HTMLElement | null>(null);
  const bubbleRef = useRef<HTMLSpanElement | null>(null);
  const hoverTimerRef = useRef<number | null>(null);
  const [hovered, setHovered] = useState(false);
  const [focused, setFocused] = useState(false);
  const [pinned, setPinned] = useState(false);
  const [dismissed, setDismissed] = useState(false);
  const [position, setPosition] = useState<Position>({ left: 0, top: 0, ready: false });
  const visible = !dismissed && (hovered || focused || pinned);

  const setTriggerRef = useCallback((element: HTMLElement | null) => {
    triggerRef.current = element;
  }, []);

  const handleEscape = useCallback((event: KeyboardEvent) => {
    if (event.key === "Escape") {
      setPinned(false);
      setDismissed(true);
    }
  }, []);

  const keepOpen = useCallback(() => {
    if (hoverTimerRef.current !== null) window.clearTimeout(hoverTimerRef.current);
    hoverTimerRef.current = null;
    setHovered(true);
    setDismissed(false);
  }, []);

  const closeAfterPointerLeaves = useCallback(() => {
    if (hoverTimerRef.current !== null) window.clearTimeout(hoverTimerRef.current);
    hoverTimerRef.current = window.setTimeout(() => {
      setHovered(false);
      hoverTimerRef.current = null;
    }, 120);
  }, []);

  useEffect(
    () => () => {
      if (hoverTimerRef.current !== null) window.clearTimeout(hoverTimerRef.current);
    },
    [],
  );

  useEffect(() => {
    if (!visible) return;
    window.addEventListener("keydown", handleEscape);
    return () => window.removeEventListener("keydown", handleEscape);
  }, [handleEscape, visible]);

  useEffect(() => {
    if (!visible) return;
    const closeOnOutsidePointer = (event: PointerEvent) => {
      if (!triggerRef.current?.contains(event.target as Node)) {
        setPinned(false);
        setDismissed(true);
      }
    };
    document.addEventListener("pointerdown", closeOnOutsidePointer);
    return () => document.removeEventListener("pointerdown", closeOnOutsidePointer);
  }, [visible]);

  useLayoutEffect(() => {
    if (!visible) return;
    const trigger = triggerRef.current;
    const bubble = bubbleRef.current;
    if (!trigger || !bubble) return;

    const updatePosition = () => {
      const triggerBounds = trigger.getBoundingClientRect();
      const gap = 8;
      const margin = 8;

      // Measure the content before positioning it so a previous right-edge
      // position cannot shrink the bubble's available width.
      bubble.style.left = `${margin}px`;
      bubble.style.width = "";
      const measuredWidth = bubble.getBoundingClientRect().width;
      const availableWidth = Math.max(0, window.innerWidth - margin * 2);
      bubble.style.width = `${Math.min(measuredWidth, availableWidth)}px`;
      const bubbleBounds = bubble.getBoundingClientRect();

      const centeredLeft = triggerBounds.left + triggerBounds.width / 2 - bubbleBounds.width / 2;
      const left = Math.min(
        Math.max(centeredLeft, margin),
        Math.max(margin, window.innerWidth - bubbleBounds.width - margin),
      );
      const above = triggerBounds.top - bubbleBounds.height - gap;
      const below = triggerBounds.bottom + gap;
      const preferredTop = above >= margin ? above : below;
      const top = Math.min(
        Math.max(preferredTop, margin),
        Math.max(margin, window.innerHeight - bubbleBounds.height - margin),
      );
      setPosition({ left, top, width: bubbleBounds.width, ready: true });
    };

    updatePosition();
    window.addEventListener("resize", updatePosition);
    window.addEventListener("scroll", updatePosition, true);
    return () => {
      window.removeEventListener("resize", updatePosition);
      window.removeEventListener("scroll", updatePosition, true);
    };
  }, [content, visible]);

  const sharedHandlers = {
    ref: setTriggerRef,
    "aria-describedby": id,
    onMouseEnter: keepOpen,
    onMouseLeave: closeAfterPointerLeaves,
    onFocus: () => {
      setFocused(true);
      setDismissed(false);
    },
    onBlur: () => {
      setFocused(false);
      setPinned(false);
    },
    onClick: () => {
      setPinned(true);
      setDismissed(false);
    },
  };

  const tooltipBubble =
    visible && typeof document !== "undefined"
      ? createPortal(
          <span
            className={styles.bubble}
            ref={bubbleRef}
            role="tooltip"
            aria-hidden="true"
            onMouseEnter={keepOpen}
            onMouseLeave={closeAfterPointerLeaves}
            style={{
              left: position.left,
              top: position.top,
              ...(position.width === undefined ? {} : { width: position.width }),
              visibility: position.ready ? "visible" : "hidden",
            }}
          >
            {content}
          </span>,
          document.body,
        )
      : null;

  return (
    <>
      {children === undefined ? (
        <button
          {...sharedHandlers}
          type="button"
          className={styles.helpButton}
          aria-label={`Help: ${label}`}
        >
          <span aria-hidden="true">i</span>
        </button>
      ) : targetElement === "div" ? (
        <div
          {...sharedHandlers}
          className={`${styles.target} ${targetClassName ?? ""}`}
          tabIndex={targetTabIndex}
          {...(targetRole ? { role: targetRole, "aria-label": targetAriaLabel } : {})}
        >
          {children}
        </div>
      ) : (
        <span
          {...sharedHandlers}
          className={`${styles.target} ${targetClassName ?? ""}`}
          tabIndex={targetTabIndex}
          {...(targetRole ? { role: targetRole, "aria-label": targetAriaLabel } : {})}
        >
          {children}
        </span>
      )}
      <span id={id} hidden>
        {content}
      </span>
      {tooltipBubble}
    </>
  );
}
