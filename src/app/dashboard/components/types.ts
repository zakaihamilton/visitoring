import type { getAnalyticsData, getRecentEventsData } from "@/lib/analytics";

export type RecentEventsData = Awaited<ReturnType<typeof getRecentEventsData>>;

export type DashboardData = Awaited<ReturnType<typeof getAnalyticsData>>;
export type DashboardFilters = Record<string, string>;
export type DashboardSite = { id: string; name: string };

export type DashboardProps = {
  sites: DashboardSite[];
  siteId: string;
  data: DashboardData;
  filters: DashboardFilters;
};

export function formatNumber(value: number): string {
  return new Intl.NumberFormat("en").format(value);
}
