"use client";

import { createContext, useContext, useState, type ReactNode } from "react";
import { chartMetric, type ChartMetric } from "./chart-data";

const MetricContext = createContext<{
  metric: ChartMetric;
  setMetric: (metric: ChartMetric) => void;
} | null>(null);

export function TrafficMetricProvider({
  initialMetric,
  children,
}: {
  initialMetric?: string;
  children: ReactNode;
}) {
  const [metric, updateMetric] = useState(chartMetric(initialMetric));
  function setMetric(next: ChartMetric) {
    updateMetric(next);
    const url = new URL(window.location.href);
    url.searchParams.set("metric", next);
    window.history.replaceState(null, "", url);
  }
  return <MetricContext.Provider value={{ metric, setMetric }}>{children}</MetricContext.Provider>;
}

export function useTrafficMetric(initialMetric?: string) {
  const context = useContext(MetricContext);
  const [metric, setMetric] = useState(chartMetric(initialMetric));
  return context ?? { metric, setMetric };
}
