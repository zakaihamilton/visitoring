import { dateLabel } from "@/lib/analytics-period";

export const chartMeasures = {
  visitors: "Visitors",
  pageViews: "Page views",
  sessions: "Sessions",
  customEvents: "Custom events",
} as const;
export type ChartMetric = keyof typeof chartMeasures;
export const chartMetricOptions = Object.entries(chartMeasures).map(([value, label]) => ({
  value,
  label,
}));
export function chartMetric(value?: string): ChartMetric {
  return Object.hasOwn(chartMeasures, value ?? "") ? (value as ChartMetric) : "visitors";
}
export function chartInterval(from: string, to: string, hourly: boolean) {
  const end = new Date(Date.parse(to) - 1).toISOString();
  return !hourly && from.slice(0, 10) === end.slice(0, 10)
    ? dateLabel(from, false, true)
    : `${dateLabel(from, hourly, true)} – ${dateLabel(end, hourly, true)}`;
}
