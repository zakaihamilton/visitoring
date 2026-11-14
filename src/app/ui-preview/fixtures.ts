import type { DashboardData } from "@/app/dashboard/components/types";
import type { ProjectActionState } from "@/app/projects/manage-actions";
import { analyticsPeriod, emptyMetrics } from "@/lib/analytics-period";

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

const highTraffic: DashboardData = {
  ...populated,
  ...metrics(94852, 2381),
  previous: metrics(81126, 2034),
  breakdownTotal: 189704,
  trend: populated.trend.map((bucket, index) => ({
    ...bucket,
    current: metrics([12900, 13840, 14220, 11740, 15320, 16600, 10232][index], 320),
    previous: metrics([11000, 12000, 13000, 10200, 13500, 14100, 7326][index], 280),
  })),
  pages: rows(
    Array.from({ length: 18 }, (_, index) => [
      index === 0 ? "/" : `/resources/guide-${String(index + 1).padStart(2, "0")}`,
      17400 - index * 731,
    ] as [string, number]),
  ),
  referrers: rows(
    Array.from({ length: 14 }, (_, index) => [
      ["Direct", "google.com", "newsletter.example", "docs.partner.test"][index % 4] +
        (index > 3 ? ` · ${index + 1}` : ""),
      28600 - index * 1390,
    ] as [string, number]),
  ),
  countries: rows([
    ["United States", 72100],
    ["United Kingdom", 31000],
    ["Germany", 24900],
    ["Israel", 18700],
    ["Japan", 13004],
  ]),
  regions: rows([
    ["California", 27100],
    ["New York", 22000],
    ["London", 21000],
    ["Berlin", 18000],
    ["Tel Aviv", 16000],
  ]),
  eventNames: ["page_view", "signup", "purchase", "trial_started", "invite_sent"],
};

const longNames: DashboardData = {
  ...populated,
  pages: rows([
    [
      "/resources/customer-stories/how-distributed-product-teams-coordinate-regional-launches-and-keep-analytics-consistent",
      720,
    ],
    ["/documentation/integrations/enterprise-single-sign-on/configuration-guide", 350],
    ["/pricing", 245],
  ]),
  referrers: rows([
    ["partner-network-for-independent-publishers-and-creative-studios.example", 420],
    ["newsletter.example", 314],
  ]),
};

const dateRangeGenerated = analyticsPeriod(
  "2027-01-01T00:00:00.000Z",
  "2027-01-07T23:59:59.999Z",
  new Date("2027-01-08T12:00:00Z"),
);
const { buckets: dateRangeBuckets, ...dateRangePeriod } = dateRangeGenerated;
const dateRangeEmpty: DashboardData = {
  ...empty,
  previous: emptyMetrics,
  period: dateRangePeriod,
  retrievedAt: "2027-01-08T12:00:00.000Z",
  hasSiteActivity: true,
  eventNames: populated.eventNames,
  trend: dateRangeBuckets.map((bucket) => ({
    ...bucket,
    current: emptyMetrics,
    previous: emptyMetrics,
  })),
};

const delayedIngestion: DashboardData = {
  ...populated,
  retrievedAt: "2026-10-04T08:30:00.000Z",
};
const ingestionError: DashboardData = {
  ...empty,
  hasSiteActivity: true,
  eventNames: populated.eventNames,
};

export const scenarios = {
  populated: { label: "Traffic", data: populated, event: "" },
  onboarding: { label: "New site", data: empty, event: "" },
  filtered: {
    label: "No matching activity",
    data: { ...empty, hasSiteActivity: true, eventNames: ["signup"] },
    event: "signup",
  },
  "high-traffic": { label: "High traffic", data: highTraffic, event: "" },
  "long-names": {
    label: "Long project and URL names",
    data: longNames,
    event: "",
    projectName: "Example project for distributed product and analytics teams",
    siteName: "Regional publishing platform · customer analytics and events",
  },
  "date-range-empty": {
    label: "No activity in date range",
    data: dateRangeEmpty,
    event: "",
    from: "2027-01-01",
    to: "2027-01-07",
  },
  "tracking-blocked": {
    label: "Tracking blocked",
    data: empty,
    event: "",
    siteName: "Example site · tracking blocked",
  },
  "delayed-ingestion": {
    label: "Delayed ingestion",
    data: delayedIngestion,
    event: "",
  },
  "ingestion-error": { label: "Ingestion error", data: ingestionError, event: "" },
  "project-access-error": {
    label: "Project access error",
    data: populated,
    event: "",
  },
} satisfies Record<
  string,
  {
    label: string;
    data: DashboardData;
    event: string;
    from?: string;
    to?: string;
    projectName?: string;
    siteName?: string;
  }
>;
export type Scenario = keyof typeof scenarios;
export const sites = [{ id: "demo-site", name: "Example site" }];
export const projectCreationSuccess: ProjectActionState = {
  message: "New example project added. You now have admin access to its workspace.",
  createdProjectId: "preview-created-project",
};
