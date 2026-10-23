import { DashboardPageShell } from "../DashboardPageShell";
export const dynamic = "force-dynamic";
export default function ChartDataPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  return <DashboardPageShell searchParams={searchParams} view="chart-data" />;
}
