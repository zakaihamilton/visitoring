"use client";

import { useTransition } from "react";
import { useRouter } from "next/navigation";
import { Tooltip } from "@/app/components/Tooltip";
import styles from "../dashboard.module.css";

export function DataFreshness({ retrievedAt }: { retrievedAt: string }) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const date = new Date(retrievedAt);
  const displayTime = new Intl.DateTimeFormat("en", {
    month: "short",
    day: "numeric",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
    hourCycle: "h23",
    timeZone: "UTC",
  }).format(date);

  return (
    <div className={`${styles.updated} ${styles.dataFreshness}`}>
      <time dateTime={retrievedAt}>Updated {displayTime} UTC</time>
      <Tooltip
        label="Refresh data"
        content={pending ? "Refreshing traffic data…" : "Refresh traffic data"}
        targetTabIndex={-1}
      >
        <button
          type="button"
          className={styles.refreshButton}
          aria-label="Refresh data"
          aria-disabled={pending}
          aria-busy={pending}
          onClick={() => {
            if (pending) return;
            startTransition(() => {
              const url = new URL(window.location.href);
              if (url.pathname === "/dashboard/events" && url.searchParams.has("before")) {
                url.searchParams.delete("before");
                url.searchParams.delete("page");
                router.replace(`${url.pathname}${url.search}${url.hash}`, { scroll: false });
              } else {
                router.refresh();
              }
            });
          }}
        >
          <svg
            className={pending ? styles.refreshSpinning : undefined}
            width="18"
            height="18"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="1.75"
            strokeLinecap="round"
            strokeLinejoin="round"
            aria-hidden="true"
            focusable="false"
          >
            <path d="M3 12a9 9 0 0 1 9-9 9.75 9.75 0 0 1 6.74 2.74L21 8" />
            <path d="M21 3v5h-5" />
            <path d="M21 12a9 9 0 0 1-9 9 9.75 9.75 0 0 1-6.74-2.74L3 16" />
            <path d="M8 16H3v5" />
          </svg>
        </button>
      </Tooltip>
      <span className={styles.refreshStatus} role="status">
        {pending ? "Refreshing data…" : ""}
      </span>
    </div>
  );
}
