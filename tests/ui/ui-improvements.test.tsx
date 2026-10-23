// @vitest-environment jsdom
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";
import { WorkspaceSwitcher } from "@/app/components/WorkspaceSwitcher";
import { Dashboard } from "@/app/dashboard/view";
import type { DashboardData } from "@/app/dashboard/components/types";

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
    events: [],
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
    expect(screen.getByText(/Full setup instructions/i).getAttribute("href")).toBe("/settings/setup");
  });
});
