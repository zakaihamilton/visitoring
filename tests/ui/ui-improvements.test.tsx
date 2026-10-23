// @vitest-environment jsdom
import { cleanup, render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, describe, expect, it, vi } from "vitest";
import { WorkspaceSwitcher } from "@/app/components/WorkspaceSwitcher";
import { analyticsPeriod, emptyMetrics } from "@/lib/analytics-period";
import { ChartDataView } from "@/app/dashboard/chart-data/view";
import { ActivityChart } from "@/app/dashboard/components/ActivityChart";
import { BreakdownList } from "@/app/dashboard/components/BreakdownList";
import { TrafficFilterSummary } from "@/app/dashboard/components/TrafficFilterSummary";
import { Dashboard } from "@/app/dashboard/view";
import type { DashboardData } from "@/app/dashboard/components/types";

vi.mock("next/navigation", () => ({ useRouter: () => ({ refresh: vi.fn() }) }));

afterEach(cleanup);
Element.prototype.scrollIntoView = vi.fn();

describe("WorkspaceSwitcher", () => {
  const workspaces = [
    { id: "ws-1", name: "Main App" },
    { id: "ws-2", name: "Docs Portal" },
  ];

  it("renders a dropdown listbox when multiple workspaces exist and handles selection", async () => {
    const user = userEvent.setup();
    const action = vi.fn(async (_formData: FormData) => {});

    render(
      <WorkspaceSwitcher
        workspaces={workspaces}
        currentWorkspaceId="ws-1"
        currentWorkspaceName="Main App"
        action={action}
      />,
    );

    const combobox = screen.getByRole("combobox", { name: "Project Main App" });
    expect(combobox).toBeDefined();

    await user.click(combobox);
    const option = screen.getByRole("option", { name: "Docs Portal" });
    await user.click(option);

    expect(action).toHaveBeenCalledOnce();
    expect(action.mock.calls[0]?.[0].get("workspaceId")).toBe("ws-2");
  });

  it("renders a link to /projects when only one workspace is available", () => {
    const action = vi.fn(async (_formData: FormData) => {});
    render(
      <WorkspaceSwitcher
        workspaces={[{ id: "ws-1", name: "Main App" }]}
        currentWorkspaceId="ws-1"
        currentWorkspaceName="Main App"
        action={action}
      />,
    );

    const link = screen.getByRole("link", { name: "Main App" });
    expect(link.getAttribute("href")).toBe("/projects");
  });
});

describe("Dashboard setup guide empty state", () => {
  const emptyData: DashboardData = {
    previous: emptyMetrics,
    period: (({ buckets: _buckets, ...period }) => period)(
      analyticsPeriod(
        "2026-10-01T00:00:00.000Z",
        "2026-10-23T23:59:59.999Z",
        new Date("2026-10-23T12:00:00.000Z"),
      ),
    ),
    retrievedAt: "2026-10-23T12:00:00.000Z",
    hasSiteActivity: false,
    breakdownTotal: 0,
    breakdownMeasure: "Page views",
    total: 0,
    pageViews: 0,
    visitors: 0,
    sessions: 0,
    customEvents: 0,
    trend: [],
    pages: [],
    referrers: [],
    devices: [],
    browsers: [],
    systems: [],
    countries: [],
    regions: [],
    eventNames: [],
  };

  it("renders the onboarding setup guide and snippet when total events is 0", () => {
    const filters = {
      from: "2026-10-01",
      to: "2026-10-23",
      event: "",
      path: "",
      property: "",
      propertyValue: "",
      visitor: "",
      session: "",
    };

    render(
      <Dashboard
        sites={[{ id: "site-1", name: "Production Site" }]}
        siteId="site-1"
        data={emptyData}
        filters={filters}
      />,
    );

    expect(screen.getByText(/Ready to start tracking Production Site\?/i)).toBeDefined();
    expect(screen.getByText(/Full setup instructions/i).getAttribute("href")).toBe(
      "/settings/setup",
    );
  });
  it("shows a filtered empty state for a site with retained activity", () => {
    render(
      <Dashboard
        sites={[{ id: "site-1", name: "Production Site" }]}
        siteId="site-1"
        data={{ ...emptyData, hasSiteActivity: true }}
        filters={{ from: "2026-10-01", to: "2026-10-23", event: "signup" }}
      />,
    );
    expect(
      screen.getByRole("heading", { name: "No activity matches these filters" }),
    ).toBeDefined();
    expect(screen.queryByText(/Ready to start tracking/)).toBeNull();
  });

  it("preserves filters in date shortcuts and resets to the selected site", () => {
    render(
      <TrafficFilterSummary
        siteId="site-1"
        filters={{
          from: "2026-10-01",
          to: "2026-10-23",
          event: "signup",
          path: "/pricing",
          visitor: "anonymous",
        }}
        retrievedAt={emptyData.retrievedAt}
      />,
    );
    const shortcut = screen.getByRole("link", { name: "Last 7 days" });
    const params = new URL(shortcut.getAttribute("href") ?? "", "https://example.test")
      .searchParams;
    expect(Object.fromEntries(params)).toMatchObject({
      site: "site-1",
      event: "signup",
      path: "/pricing",
      visitor: "anonymous",
      from: "2026-10-17",
      to: "2026-10-23",
    });
    expect(screen.getByRole("link", { name: "Reset filters" }).getAttribute("href")).toBe(
      "/dashboard?site=site-1",
    );
    expect(screen.getByRole("region", { name: "Active filters" }).textContent).toContain(
      "Event: signup",
    );
  });

  it("uses the complete population for breakdown shares", () => {
    render(
      <BreakdownList
        title="Popular pages"
        rows={[{ label: "/pricing", count: 2 }]}
        denominator={10}
        measure="Page views"
        limit={6}
      />,
    );
    expect(screen.getByText("· 20%")).toBeDefined();
    expect(screen.getByText("Page views · Top 6")).toBeDefined();
  });

  it("switches chart metrics, exposes keyboard values, and links to the separate data page", async () => {
    const user = userEvent.setup();
    const period = analyticsPeriod(
      "2026-10-22T00:00:00.000Z",
      "2026-10-22T23:59:59.999Z",
      new Date(emptyData.retrievedAt),
    );
    const trend = period.buckets.map((bucket, index) => ({
      ...bucket,
      current: { ...emptyMetrics, visitors: index + 1, pageViews: index + 3 },
      previous: { ...emptyMetrics, visitors: 1, pageViews: 2 },
    }));
    render(
      <ActivityChart
        siteId="site-1"
        filters={{ from: "2026-10-22", to: "2026-10-22", event: "signup" }}
        data={{ ...emptyData, total: 10, period, trend }}
      />,
    );
    const chart = screen.getByRole("region", { name: "Visitors by hour" });
    const points = chart.querySelectorAll("button");
    expect([...points].filter((point) => point.tabIndex === 0)).toHaveLength(1);
    points[0]?.focus();
    await user.keyboard("{ArrowRight}");
    expect(document.activeElement).toBe(points[1]);
    expect([...points].filter((point) => point.tabIndex === 0)).toHaveLength(1);
    await user.keyboard("{End}");
    expect(document.activeElement).toBe(points[points.length - 1]);
    await user.keyboard("{Home}");
    expect(document.activeElement).toBe(points[0]);
    await user.tab();
    expect(document.activeElement).toBe(screen.getByRole("link", { name: "View chart data" }));
    expect(points[1]?.getAttribute("aria-label")).toContain("2 visitors");
    await user.click(screen.getByRole("combobox", { name: "Metric" }));
    await user.click(screen.getByRole("option", { name: /^Page views$/ }));
    expect(screen.getByRole("region", { name: "Page views by hour" })).toBeDefined();
    const link = screen.getByRole("link", { name: "View chart data" });
    const url = new URL(link.getAttribute("href") ?? "", "https://example.test");
    expect(url.pathname).toBe("/dashboard/chart-data");
    expect(Object.fromEntries(url.searchParams)).toMatchObject({
      metric: "pageViews",
      site: "site-1",
      from: "2026-10-22",
      to: "2026-10-22",
      event: "signup",
    });
    expect(screen.queryByRole("table")).toBeNull();
  });
  it("renders chart data separately with paired counts and scoped controls", () => {
    const bucket = {
      from: "2026-10-01T00:00:00.000Z",
      to: "2026-10-02T00:00:00.000Z",
      previousFrom: "2026-09-01T00:00:00.000Z",
      previousTo: "2026-09-02T00:00:00.000Z",
      current: { ...emptyMetrics, pageViews: 6 },
      previous: { ...emptyMetrics, pageViews: 3 },
    };
    render(
      <ChartDataView
        sites={[{ id: "site-1", name: "Production" }]}
        siteId="site-1"
        filters={{ from: "2026-10-01", to: "2026-10-23", event: "", metric: "pageViews" }}
        data={{ ...emptyData, total: 6, trend: [bucket] }}
      />,
    );
    expect(screen.getByRole("heading", { name: "Chart data" })).toBeDefined();
    expect(screen.getByRole("table", { name: "Page views · UTC" })).toBeDefined();
    expect(screen.getByRole("cell", { name: /^6$/ })).toBeDefined();
    expect(screen.getByRole("cell", { name: /^3$/ })).toBeDefined();
    expect(screen.queryByRole("heading", { name: "Traffic over time" })).toBeNull();
    expect(screen.getByRole("link", { name: "Last 7 days" }).getAttribute("href")).toContain(
      "/dashboard/chart-data?",
    );
    expect(screen.getByRole("link", { name: "Traffic overview" }).getAttribute("href")).toContain(
      "metric=pageViews",
    );
  });
});
