import { DropdownSelect } from "@/app/components/DropdownSelect";
import { FilterLabel } from "./FilterLabel";
import type { DashboardData, DashboardSite } from "./types";
import styles from "../dashboard.module.css";

export function CoreDashboardFilters({
  sites,
  siteId,
  data,
  filters,
}: {
  sites: DashboardSite[];
  siteId: string;
  data: DashboardData;
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
        <DropdownSelect id="filter-site" name="site" defaultValue={siteId}>
          {sites.map((site) => (
            <option key={site.id} value={site.id}>
              {site.name}
            </option>
          ))}
        </DropdownSelect>
      </div>
      <div className={styles.filterField}>
        <FilterLabel
          label="Start date"
          htmlFor="filter-from"
          help="Include events from the start of this date in UTC."
        />
        <input id="filter-from" type="date" name="from" defaultValue={filters.from} />
      </div>
      <div className={styles.filterField}>
        <FilterLabel
          label="End date"
          htmlFor="filter-to"
          help="Include events through the end of this date in UTC."
        />
        <input id="filter-to" type="date" name="to" defaultValue={filters.to} />
      </div>
      <div className={styles.filterField}>
        <FilterLabel
          label="Event type"
          htmlFor="filter-event"
          help="Enter an exact event name to filter results. Clear the field to include all event types."
        />
        <input
          id="filter-event"
          name="event"
          list="event-name-options"
          defaultValue={filters.event}
          maxLength={128}
          placeholder="All events"
        />
        <datalist id="event-name-options">
          {data.eventNames.map((name) => (
            <option key={name} value={name} />
          ))}
        </datalist>
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
