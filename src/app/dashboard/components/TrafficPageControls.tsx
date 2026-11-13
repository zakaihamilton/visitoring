"use client";

import { DashboardFiltersForm } from "./DashboardFilters";
import { TrafficFilterSummary } from "./TrafficFilterSummary";
import type { DashboardData, DashboardFilters, DashboardSite } from "./types";

type Props = {
  sites: DashboardSite[];
  siteId: string;
  data: Pick<DashboardData, "eventNames">;
  filters: DashboardFilters;
  retrievedAt: string;
  pathname?: "/dashboard" | "/dashboard/events" | "/dashboard/chart-data";
};

export function TrafficPageControls({
  sites,
  siteId,
  data,
  filters,
  retrievedAt,
  pathname,
}: Props) {
  return (
    <>
      <TrafficFilterSummary
        siteId={siteId}
        filters={filters}
        retrievedAt={retrievedAt}
        pathname={pathname}
      />
      <DashboardFiltersForm
        key={`${siteId}:${JSON.stringify(filters)}`}
        sites={sites}
        siteId={siteId}
        data={data}
        filters={filters}
      />
    </>
  );
}
