import type { FormEvent } from "react";

type ConfirmationRef = { current: boolean };

export function guardConfirmableSubmit(
  event: FormEvent<HTMLFormElement>,
  confirmedRef: ConfirmationRef,
  setConfirmOpen: (open: boolean) => void,
): void {
  if (confirmedRef.current) {
    confirmedRef.current = false;
    setConfirmOpen(false);
    return;
  }

  event.preventDefault();
  setConfirmOpen(true);
}
