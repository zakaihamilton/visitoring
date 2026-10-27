// @vitest-environment jsdom
import { cleanup, render, screen } from "@testing-library/react";
import { afterEach, expect, it, vi } from "vitest";
import { PreviewGuard } from "@/app/ui-preview/PreviewGuard";

afterEach(cleanup);

it("blocks form submission before the child submit handler runs", () => {
  const submit = vi.fn();
  render(
    <PreviewGuard>
      <form aria-label="Example form" onSubmit={submit}>
        <button type="submit">Save</button>
      </form>
    </PreviewGuard>,
  );
  const event = new Event("submit", { bubbles: true, cancelable: true });
  expect(screen.getByRole("form", { name: "Example form" }).dispatchEvent(event)).toBe(false);
  expect(submit).not.toHaveBeenCalled();
});

it.each(["click", "auxclick", "contextmenu"])(
  "blocks %s on application links while leaving the banner outside the guard usable",
  (type) => {
    const childHandler = vi.fn();
    render(
      <>
        <a href="#preview-navigation">Preview navigation</a>
        <PreviewGuard>
          <a href="/dashboard" onClick={childHandler}>
            <span>Dashboard</span>
          </a>
        </PreviewGuard>
      </>,
    );
    const event = new MouseEvent(type, {
      bubbles: true,
      cancelable: true,
      button: type === "auxclick" ? 1 : 0,
    });
    expect(screen.getByText("Dashboard").dispatchEvent(event)).toBe(false);
    expect(childHandler).not.toHaveBeenCalled();
    const bannerEvent = new MouseEvent(type, { bubbles: true, cancelable: true });
    expect(screen.getByText("Preview navigation").dispatchEvent(bannerEvent)).toBe(true);
  },
);
