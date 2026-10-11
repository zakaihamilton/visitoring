import { useLayoutEffect, useState } from "react";
import type { RefObject } from "react";

export type TooltipPosition = {
  left: number;
  top: number;
  width?: number;
  maxHeight?: number;
  ready: boolean;
};

const initialPosition: TooltipPosition = { left: 0, top: 0, ready: false };

export function useTooltipPosition(
  visible: boolean,
  triggerRef: RefObject<HTMLElement | null>,
  bubbleRef: RefObject<HTMLSpanElement | null>,
): TooltipPosition {
  const [position, setPosition] = useState<TooltipPosition>(initialPosition);

  useLayoutEffect(() => {
    if (!visible) return;
    const trigger = triggerRef.current;
    const bubble = bubbleRef.current;
    if (!trigger || !bubble) return;

    let frame = 0;
    const updatePosition = () => {
      frame = 0;
      const triggerBounds = trigger.getBoundingClientRect();
      const gap = 8;
      const margin = 8;
      const viewportWidth = window.innerWidth;
      const viewportHeight = window.innerHeight;

      // Measure from a stable position so a previous edge clamp does not affect
      // the bubble's intrinsic width.
      bubble.style.left = `${margin}px`;
      bubble.style.width = "";
      bubble.style.maxHeight = `${Math.max(0, viewportHeight - margin * 2)}px`;
      const measuredWidth = bubble.getBoundingClientRect().width;
      const availableWidth = Math.max(0, viewportWidth - margin * 2);
      bubble.style.width = `${Math.min(measuredWidth, availableWidth)}px`;
      const measuredBounds = bubble.getBoundingClientRect();

      const spaceAbove = Math.max(0, triggerBounds.top - gap - margin);
      const spaceBelow = Math.max(0, viewportHeight - triggerBounds.bottom - gap - margin);
      const fitsAbove = measuredBounds.height <= spaceAbove;
      const fitsBelow = measuredBounds.height <= spaceBelow;
      const placeAbove = fitsAbove || (!fitsBelow && spaceAbove > spaceBelow);
      const maxHeight = placeAbove ? spaceAbove : spaceBelow;
      bubble.style.maxHeight = `${maxHeight}px`;
      const bubbleBounds = bubble.getBoundingClientRect();

      const centeredLeft = triggerBounds.left + triggerBounds.width / 2 - bubbleBounds.width / 2;
      const left = Math.min(
        Math.max(centeredLeft, margin),
        Math.max(margin, viewportWidth - bubbleBounds.width - margin),
      );
      const preferredTop = placeAbove
        ? triggerBounds.top - bubbleBounds.height - gap
        : triggerBounds.bottom + gap;
      const top = Math.min(
        Math.max(preferredTop, margin),
        Math.max(margin, viewportHeight - bubbleBounds.height - margin),
      );
      // Restore the final DOM value after measurement; React may skip writing an
      // unchanged style prop even though the DOM was temporarily moved.
      bubble.style.left = `${left}px`;
      setPosition({ left, top, width: bubbleBounds.width, maxHeight, ready: true });
    };

    updatePosition();
    const scheduleUpdate = () => {
      if (frame) return;
      frame = window.requestAnimationFrame(updatePosition);
    };
    const resizeObserver =
      typeof ResizeObserver === "undefined" ? null : new ResizeObserver(scheduleUpdate);
    resizeObserver?.observe(trigger);
    resizeObserver?.observe(bubble);
    window.addEventListener("resize", scheduleUpdate);
    window.addEventListener("scroll", scheduleUpdate, true);
    window.visualViewport?.addEventListener("resize", scheduleUpdate);
    window.visualViewport?.addEventListener("scroll", scheduleUpdate);

    return () => {
      if (frame) window.cancelAnimationFrame(frame);
      resizeObserver?.disconnect();
      window.removeEventListener("resize", scheduleUpdate);
      window.removeEventListener("scroll", scheduleUpdate, true);
      window.visualViewport?.removeEventListener("resize", scheduleUpdate);
      window.visualViewport?.removeEventListener("scroll", scheduleUpdate);
    };
  }, [visible, triggerRef, bubbleRef]);

  return position;
}
