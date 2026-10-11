import { FilterLabel } from "./FilterLabel";
import styles from "../dashboard.module.css";

export function AdvancedDashboardFilters({ filters }: { filters: Record<string, string> }) {
  return (
    <details className={styles.moreFilters}>
      <summary>More options</summary>
      <p className={styles.moreHint}>
        Narrow results by event details or an exact visitor or session code.
      </p>
      <div className={styles.moreGrid}>
        <div className={styles.filterField}>
          <FilterLabel
            label="Event detail name"
            htmlFor="filter-property"
            help="Enter the exact detail name sent with an event, such as plan."
          />
          <input
            id="filter-property"
            name="property"
            defaultValue={filters.property}
            placeholder="plan"
          />
        </div>
        <div className={styles.filterField}>
          <FilterLabel
            label="Event detail value"
            htmlFor="filter-property-value"
            help="Enter part of the detail value to find matching events. This filter applies when an event detail name is also set."
          />
          <input
            id="filter-property-value"
            name="propertyValue"
            defaultValue={filters.propertyValue}
            placeholder="starter"
          />
        </div>
        <div className={styles.filterField}>
          <FilterLabel
            label="Visitor"
            htmlFor="filter-visitor"
            help="Match events from one exact anonymous visitor code."
          />
          <input
            id="filter-visitor"
            name="visitor"
            defaultValue={filters.visitor}
            placeholder="Paste visitor code"
          />
        </div>
        <div className={styles.filterField}>
          <FilterLabel
            label="Session"
            htmlFor="filter-session"
            help="Match events from one exact browser session code."
          />
          <input
            id="filter-session"
            name="session"
            defaultValue={filters.session}
            placeholder="Paste session code"
          />
        </div>
      </div>
    </details>
  );
}
