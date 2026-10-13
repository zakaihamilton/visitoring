import { useEffect, type Dispatch, type RefObject, type SetStateAction } from "react";

export function useDismissOnOutsidePointer<T extends HTMLElement>(
  open: boolean,
  containerRef: RefObject<T | null>,
  setOpen: Dispatch<SetStateAction<boolean>>,
) {
  useEffect(() => {
    if (!open) return;

    function closeOnOutsidePointer(event: PointerEvent) {
      if (event.target instanceof Node && !containerRef.current?.contains(event.target)) {
        setOpen(false);
      }
    }

    document.addEventListener("pointerdown", closeOnOutsidePointer);
    return () => document.removeEventListener("pointerdown", closeOnOutsidePointer);
  }, [containerRef, open, setOpen]);
}
