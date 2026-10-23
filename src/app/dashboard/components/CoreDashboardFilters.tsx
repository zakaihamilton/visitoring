import { DropdownSelect } from "@/app/components/DropdownSelect";
import { EventNameCombobox } from "@/app/components/EventNameCombobox";
import { FilterLabel } from "./FilterLabel";
import type { DashboardData, DashboardSite } from "./types";
import styles from "../dashboard.module.css";

export function CoreDashboardFilters({
  sites,
  siteId,
  data,
  filters,
  dateError,
}: {
  dateError?: string;
  sites: DashboardSite[];
  siteId: string;
  data: Pick<DashboardData, "eventNames">;
  filters: Record<string, string>;
}) {
  return (
    <>
      <div className={styles.filterField}>
        <FilterLabel
          label="Site"
          htmlFor="filter-site"
          help="Choose which website’s events to include in the dashboard."
        />
        <DropdownSelect
          id="filter-site"
          name="site"
          aria-label="Site"
          defaultValue={siteId}
          options={sites.map((site) => ({ value: site.id, label: site.name }))}
        />
      </div>
      <div className={styles.filterField}>
        <FilterLabel
          label="Start date"
          htmlFor="filter-from"
          help="Include events from the start of this date in UTC."
        />
        <input
          id="filter-from"
          type="date"
          name="from"
          defaultValue={filters.from}
          aria-invalid={dateError ? true : undefined}
          aria-describedby={dateError ? "date-range-error" : undefined}
        />
      </div>
      <div className={styles.filterField}>
        <FilterLabel
          label="End date"
          htmlFor="filter-to"
          help="Include events through the end of this date in UTC."
        />
        <input
          id="filter-to"
          type="date"
          name="to"
          defaultValue={filters.to}
          aria-invalid={dateError ? true : undefined}
          aria-describedby={dateError ? "date-range-error" : undefined}
        />
      </div>
      <div className={styles.filterField}>
        <FilterLabel
          label="Event type"
          htmlFor="filter-event"
          help="Enter an exact event name to filter results. Clear the field to include all event types."
        />
        <EventNameCombobox
          id="filter-event"
          name="event"
          label="Event type"
          options={data.eventNames}
          defaultValue={filters.event}
          maxLength={128}
          placeholder="All events"
        />
      </div>
      <div className={styles.filterField}>
        <FilterLabel
          label="Page path"
          htmlFor="filter-path"
          help="Find page paths containing this text. Matching ignores letter case."
        />
        <input id="filter-path" name="path" defaultValue={filters.path} placeholder="/pricing" />
      </div>
    </>
  );
}
