import type { CSSProperties, ReactNode } from "react";
import { BrandIcon } from "./BrandIcon";
import topbar from "./topbar.module.css";
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

export function TopbarSkeleton() {
  return (
    <div className={topbar.header} aria-hidden="true">
      <div className={topbar.left}>
        <span className={topbar.brand}>
          <BrandIcon />
          <span>Visitoring</span>
        </span>
        <span className={topbar.divider} />
        <Skeleton width={175} height={18} className={styles.workspace} />
        <span className={topbar.divider} />
        <Skeleton width={130} height={32} className={styles.organization} />
      </div>
      <div className={topbar.nav}>
        {["overview", "settings", "admin"].map((item) => (
          <Skeleton key={item} width={64} height={34} />
        ))}
      </div>
      <div className={topbar.account}>
        <Skeleton width={28} height={28} round />
        <Skeleton width={140} className={`${topbar.email} ${styles.accountEmail}`} />
        <Skeleton width={78} height={34} />
      </div>
    </div>
  );
}
