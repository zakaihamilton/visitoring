import { analyticsPeriod, emptyMetrics } from "@/lib/analytics-period";
import type { DashboardData } from "@/app/dashboard/components/types";

const generated = analyticsPeriod(
  "2026-10-01T00:00:00.000Z",
  "2026-10-07T23:59:59.999Z",
  new Date("2026-10-08T12:00:00Z"),
);
const { buckets, ...period } = generated;
const rows = (values: Array<[string, number]>) =>
  values.map(([label, count]) => ({ label, count }));
const metrics = (visitors: number, customEvents = 10) => ({
  total: visitors * 2,
  visitors,
  sessions: visitors + 8,
  pageViews: visitors * 2 - customEvents,
  customEvents,
});

const empty: DashboardData = {
  ...emptyMetrics,
  previous: emptyMetrics,
  period,
  retrievedAt: "2026-10-08T12:00:00.000Z",
  hasSiteActivity: false,
  breakdownTotal: 0,
  breakdownMeasure: "Page views",
  trend: buckets.map((bucket) => ({ ...bucket, current: emptyMetrics, previous: emptyMetrics })),
  pages: [],
  referrers: [],
  devices: [],
  browsers: [],
  systems: [],
  countries: [],
  regions: [],
  eventNames: [],
};

const populated: DashboardData = {
  ...empty,
  ...metrics(742),
  previous: metrics(615),
  hasSiteActivity: true,
  breakdownTotal: 1474,
  trend: buckets.map((bucket, i) => ({
    ...bucket,
    current: metrics([75, 98, 110, 83, 119, 140, 117][i], [1, 2, 1, 1, 2, 1, 2][i]),
    previous: metrics([65, 88, 92, 79, 100, 105, 86][i], [1, 2, 1, 1, 2, 1, 2][i]),
  })),
  pages: rows([
    ["/", 720],
    ["/pricing", 350],
    ["/docs/getting-started", 245],
    ["/a-very-long-page-name-to-check-how-the-dashboard-handles-overflow", 159],
  ]),
  referrers: rows([
    ["Direct", 740],
    ["google.com", 420],
    ["example.com", 314],
  ]),
  devices: rows([
    ["Desktop", 920],
    ["Mobile", 514],
    ["Tablet", 50],
  ]),
  browsers: rows([
    ["Chrome", 800],
    ["Safari", 500],
    ["Firefox", 184],
  ]),
  systems: rows([
    ["macOS", 600],
    ["Windows", 450],
    ["iOS", 434],
  ]),
  countries: rows([
    ["United States", 760],
    ["United Kingdom", 400],
    ["Israel", 324],
  ]),
  regions: rows([
    ["California", 510],
    ["London", 400],
    ["Tel Aviv", 324],
  ]),
  eventNames: ["page_view", "signup", "purchase"],
};

export const scenarios = {
  populated: { label: "Traffic", data: populated, event: "" },
  onboarding: { label: "New site", data: empty, event: "" },
  filtered: {
    label: "No matching activity",
    data: { ...empty, hasSiteActivity: true, eventNames: ["signup"] },
    event: "signup",
  },
} satisfies Record<string, { label: string; data: DashboardData; event: string }>;
export type Scenario = keyof typeof scenarios;
export const sites = [{ id: "demo-site", name: "Example site" }];
