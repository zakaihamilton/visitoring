import { TrafficLoading } from "./components/TrafficLoading";

export function DashboardLoading({ showTopbar = false }: { showTopbar?: boolean }) {
  return <TrafficLoading view="overview" showTopbar={showTopbar} />;
}
