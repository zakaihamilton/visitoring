import { dateLabel } from "@/lib/analytics-period";
import { DataFreshness } from "./DataFreshness";
import type { DashboardProps } from "./types";
import styles from "../dashboard.module.css";

type Props = {
  siteName: string;
  title: string;
  filters: DashboardProps["filters"];
  retrievedAt: string;
  partial?: boolean;
};

export function TrafficPageHeader({ siteName, title, filters, retrievedAt, partial }: Props) {
  return (
    <div className={styles.heading}>
      <div>
        <div className="eyebrow">{siteName}</div>
        <h1>{title}</h1>
        <p>
          {dateLabel(`${filters.from}T00:00:00Z`, false, true)} –{" "}
          {dateLabel(`${filters.to}T00:00:00Z`, false, true)} · UTC
          {partial ? " · Today is partial" : ""}
        </p>
      </div>
      <DataFreshness retrievedAt={retrievedAt} />
    </div>
  );
}
