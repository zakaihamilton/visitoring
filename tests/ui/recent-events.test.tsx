// @vitest-environment jsdom
import { cleanup, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { PropertyText } from "@/app/dashboard/components/RecentEventsTable";

import { RecentEventsView } from "@/app/dashboard/events/view";

vi.mock("next/navigation", () => ({ useRouter: () => ({ refresh: vi.fn() }) }));

afterEach(cleanup);

describe("recent event properties", () => {
  it("renders scalar, null, array, and nested object values and announces omitted properties", () => {
    const { container } = render(
      <PropertyText
        properties={{
          plan: "starter",
          enabled: true,
          details: { source: "pricing", step: 2 },
          labels: ["guided", "annual"],
          seats: 4,
          note: null,
        }}
      />,
    );

    expect(container.textContent).toContain("plan: starter");
    expect(container.textContent).toContain("enabled: true");
    expect(container.textContent).toContain('details: {"source":"pricing","step":2}');
    expect(container.textContent).toContain('labels: ["guided","annual"]');
    expect(container.textContent).toContain("+2 more properties");
    expect(container.textContent).not.toContain("seats: 4");
    expect(container.textContent).not.toContain("note: null");
  });

  it("renders null explicitly when it is among the first four properties", () => {
    const { container } = render(
      <PropertyText properties={{ campaign: null, retries: 0, enabled: false }} />,
    );

    expect(container.textContent).toContain("campaign: null");
    expect(container.textContent).toContain("retries: 0");
    expect(container.textContent).toContain("enabled: false");
  });
});

describe("recent events page", () => {
  it("keeps navigation and date shortcuts scoped to the current site and filters", () => {
    render(
      <RecentEventsView
        sites={[{ id: "site-1", name: "Production" }]}
        siteId="site-1"
        filters={{ from: "2026-10-01", to: "2026-10-15", event: "signup" }}
        data={{
          total: 0,
          page: 1,
          pages: 1,
          pageSize: 20,
          snapshotAt: "2026-10-16T00:00:00.000Z",
          events: [],
          eventNames: ["signup"],
          retrievedAt: "2026-10-23T12:00:00.000Z",
        }}
      />,
    );
    expect(screen.getByRole("heading", { name: /^Recent events$/ })).toBeDefined();
    expect(screen.getByText("No events found. Try changing your filters.")).toBeDefined();
    expect(screen.queryByRole("heading", { name: "Traffic over time" })).toBeNull();
    expect(screen.getByRole("link", { name: "Traffic overview" }).getAttribute("href")).toBe(
      "/dashboard?from=2026-10-01&to=2026-10-15&event=signup&metric=visitors&site=site-1",
    );
    expect(screen.getByRole("link", { name: "Last 7 days" }).getAttribute("href")).toContain(
      "/dashboard/events?",
    );
    expect(screen.getByRole("link", { name: "Reset filters" }).getAttribute("href")).toBe(
      "/dashboard/events?site=site-1",
    );
  });
});

it("keeps the snapshot cutoff in event pagination without carrying it into date changes", () => {
  render(
    <RecentEventsView
      sites={[{ id: "site-1", name: "Production" }]}
      siteId="site-1"
      filters={{ from: "2026-10-01", to: "2026-10-15", event: "signup" }}
      data={{
        total: 25,
        page: 2,
        pages: 2,
        pageSize: 20,
        snapshotAt: "2026-10-16T00:00:00.000Z",
        events: [],
        eventNames: ["signup"],
        retrievedAt: "2026-10-23T12:00:00.000Z",
      }}
    />,
  );
  const params = new URL(
    screen.getByRole("link", { name: "Newer events" }).getAttribute("href") ?? "",
    "https://example.test",
  ).searchParams;
  expect(Object.fromEntries(params)).toMatchObject({
    before: "2026-10-16T00:00:00.000Z",
    page: "1",
    site: "site-1",
    event: "signup",
  });
  expect(screen.getByRole("link", { name: "Last 7 days" }).getAttribute("href")).not.toContain(
    "before=",
  );
});
