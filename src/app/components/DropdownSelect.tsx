import type { ComponentProps } from "react";
import styles from "./dropdown-select.module.css";

type Props = ComponentProps<"select">;

export function DropdownSelect({ children, ...props }: Props) {
  return (
    <span className={styles.control}>
      <select {...props}>{children}</select>
      <svg className={styles.chevron} aria-hidden="true" viewBox="0 0 12 12" fill="none">
        <path
          d="m3 4.5 3 3 3-3"
          stroke="currentColor"
          strokeWidth="1.5"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
      </svg>
    </span>
  );
}
