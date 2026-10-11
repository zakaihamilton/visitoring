import { useCallback, useEffect, useRef, useState } from "react";

export function useTooltipInteractions(descriptionId: string) {
  const triggerRef = useRef<HTMLElement | null>(null);
  const bubbleRef = useRef<HTMLSpanElement | null>(null);
  const hoverTimerRef = useRef<number | null>(null);
  const [hovered, setHovered] = useState(false);
  const [focused, setFocused] = useState(false);
  const [pinned, setPinned] = useState(false);
  const [dismissed, setDismissed] = useState(false);
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

  const hoverHandlers = {
    onMouseEnter: keepOpen,
    onMouseLeave: closeAfterPointerLeaves,
  };

  const triggerHandlers = {
    ref: setTriggerRef,
    "aria-describedby": descriptionId,
    ...hoverHandlers,
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

  return { triggerRef, bubbleRef, visible, hoverHandlers, triggerHandlers };
}
