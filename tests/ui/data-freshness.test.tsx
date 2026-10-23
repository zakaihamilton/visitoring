// @vitest-environment jsdom
import { cleanup, render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, expect, it, vi } from "vitest";
import { DataFreshness } from "@/app/dashboard/components/DataFreshness";

const { refresh, replace } = vi.hoisted(() => ({ refresh: vi.fn(), replace: vi.fn() }));
vi.mock("next/navigation", () => ({ useRouter: () => ({ refresh, replace }) }));
afterEach(() => {
  cleanup();
  window.history.replaceState(null, "", "/");
  vi.clearAllMocks();
});

it("shows a readable UTC time and refreshes from a keyboard-accessible tooltip button", async () => {
  const user = userEvent.setup();
  render(<DataFreshness retrievedAt="2026-10-23T13:49:57.000Z" />);
  const time = screen.getByText("Updated Oct 23, 2026, 13:49 UTC");
  expect(time.getAttribute("datetime")).toBe("2026-10-23T13:49:57.000Z");
  await user.tab();
  const button = screen.getByRole("button", { name: "Refresh data" });
  expect(document.activeElement).toBe(button);
  expect(screen.getByRole("tooltip", { hidden: true }).textContent).toBe("Refresh traffic data");
  await user.keyboard("{Escape}");
  expect(screen.queryByRole("tooltip", { hidden: true })).toBeNull();
  await user.keyboard("{Enter}");
  expect(refresh).toHaveBeenCalledOnce();
});

it("refreshes a paginated event snapshot from the first page while preserving filters", async () => {
  window.history.replaceState(
    null,
    "",
    "/dashboard/events?site=site-1&from=2026-10-01&to=2026-10-23&event=signup&metric=sessions&before=2026-10-23T12%3A00%3A00.000Z&page=2#activity",
  );
  render(<DataFreshness retrievedAt="2026-10-23T12:00:00.000Z" />);
  await userEvent.setup().click(screen.getByRole("button", { name: "Refresh data" }));
  expect(refresh).not.toHaveBeenCalled();
  expect(replace).toHaveBeenCalledOnce();
  const [href, options] = replace.mock.calls[0] ?? [];
  const url = new URL(href, "https://example.test");
  expect(url.pathname).toBe("/dashboard/events");
  expect(url.hash).toBe("#activity");
  expect(Object.fromEntries(url.searchParams)).toEqual({
    site: "site-1",
    from: "2026-10-01",
    to: "2026-10-23",
    event: "signup",
    metric: "sessions",
  });
  expect(options).toEqual({ scroll: false });
});
