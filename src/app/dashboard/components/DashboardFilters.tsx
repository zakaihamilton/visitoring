import { AdvancedDashboardFilters } from "./AdvancedDashboardFilters";
import { CoreDashboardFilters } from "./CoreDashboardFilters";
import type { DashboardData, DashboardSite } from "./types";
import styles from "../dashboard.module.css";

export function DashboardFiltersForm({
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
    <form className={styles.filters} method="get">
      <CoreDashboardFilters sites={sites} siteId={siteId} data={data} filters={filters} />
      <AdvancedDashboardFilters filters={filters} />
      <button type="submit" className="button buttonPrimary">
        Apply filters
      </button>
    </form>
  );
}
