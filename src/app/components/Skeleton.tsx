import type { CSSProperties, ReactNode } from "react";
import styles from "./skeleton.module.css";

export function Skeleton({
  width,
  height = 12,
  className = "",
  round = false,
}: {
  width?: CSSProperties["width"];
  height?: CSSProperties["height"];
  className?: string;
  round?: boolean;
}) {
  return (
    <span
      aria-hidden="true"
      className={`${styles.line} ${round ? styles.round : ""} ${className}`}
      style={{ width, height }}
    />
  );
}

export function LoadingStatus({ children }: { children: ReactNode }) {
  return (
    <span className={styles.status} role="status">
      {children}
    </span>
  );
}
