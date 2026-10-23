// @vitest-environment jsdom
import { cleanup, render, screen } from "@testing-library/react";
import { afterEach, expect, it } from "vitest";
import DashboardLoading from "@/app/dashboard/loading";
import EventsLoading from "@/app/dashboard/events/loading";
import ChartDataLoading from "@/app/dashboard/chart-data/loading";
import ProjectsLoading from "@/app/projects/loading";
import SettingsLoading from "@/app/settings/loading";
import UsersLoading from "@/app/settings/users/loading";
import SetupLoading from "@/app/settings/setup/loading";
import { SiteCardsSkeleton, MembersSkeleton } from "@/app/settings/SettingsLoading";
import { TrafficLoading } from "@/app/dashboard/components/TrafficLoading";

afterEach(cleanup);

it.each([
  [DashboardLoading, "Traffic, at a glance.", "Loading traffic overview…"],
  [EventsLoading, "Recent events", "Loading recent events…"],
  [ChartDataLoading, "Chart data", "Loading chart data…"],
  [ProjectsLoading, "Choose a project", "Loading projects…"],
  [SettingsLoading, "Manage your sites", "Loading sites settings…"],
  [UsersLoading, "Manage users", "Loading users settings…"],
  [SetupLoading, "Connect your website", "Loading setup settings…"],
] as const)("%s uses its destination heading and announces loading", (Loading, title, status) => {
  render(<Loading />);
  expect(screen.getByRole("main").getAttribute("aria-busy")).toBe("true");
  expect(screen.getByRole("heading", { name: title, level: 1, hidden: true })).toBeDefined();
  expect(screen.getAllByRole("status").some((element) => element.textContent === status)).toBe(
    true,
  );
  for (const announcement of screen.getAllByRole("status")) {
    expect(announcement.closest('[aria-busy="true"]')).toBeNull();
  }
  expect(screen.queryByRole("button")).toBeNull();
  expect(screen.queryByRole("textbox")).toBeNull();
});

it("retains the existing topbar while streaming traffic data", () => {
  const { container } = render(<TrafficLoading view="events" />);
  expect(container.querySelector("header")).toBeNull();
  expect(screen.getByRole("heading", { name: "Latest activity", hidden: true })).toBeDefined();
  expect(screen.queryByRole("heading", { name: "Traffic over time", hidden: true })).toBeNull();
});

it.each([SiteCardsSkeleton, MembersSkeleton])(
  "%s announces section loading outside the busy region",
  (Loading) => {
    render(<Loading />);
    expect(screen.getByRole("status").closest('[aria-busy="true"]')).toBeNull();
    expect(screen.getByRole("region").getAttribute("aria-busy")).toBe("true");
  },
);
