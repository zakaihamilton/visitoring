import { DashboardPageShell } from "../DashboardPageShell";
export const dynamic = "force-dynamic";
export default function EventsPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  return <DashboardPageShell searchParams={searchParams} view="events" />;
}
