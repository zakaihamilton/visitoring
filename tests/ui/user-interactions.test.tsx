// @vitest-environment jsdom
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";
import { PublicHeader } from "@/app/components/PublicHeader";
import { OrganizationSwitcher } from "@/app/components/OrganizationSwitcher";

describe("public navigation", () => {
  it("supports keyboard access to the main links", async () => {
    const user = userEvent.setup();
    render(<PublicHeader page="welcome" />);
    await user.tab();
    expect(document.activeElement).toBe(screen.getByRole("link", { name: "Visitoring home" }));
    await user.tab();
    expect(document.activeElement).toBe(screen.getByRole("link", { name: "Developers" }));
  });
});

describe("organization selection", () => {
  const organizations = [
    {
      organizationId: "11111111-1111-4111-8111-111111111111",
      organizationName: "Acme",
    },
    {
      organizationId: "22222222-2222-4222-8222-222222222222",
      organizationName: "Northwind",
    },
  ];

  it("supports pointer selection and keyboard navigation with Escape", async () => {
    const user = userEvent.setup();
    const action = vi.fn(async (_formData: FormData) => {});
    render(
      <OrganizationSwitcher
        organizations={organizations}
        currentOrganizationId={organizations[0].organizationId}
        action={action}
      />,
    );

    const picker = screen.getByRole("combobox", { name: "Organization Acme" });
    await user.click(picker);
    await user.click(screen.getByRole("option", { name: "Northwind" }));
    expect(action).toHaveBeenCalledOnce();
    expect(action.mock.calls[0]?.[0].get("organizationId")).toBe(organizations[1].organizationId);

    await user.click(picker);
    await user.keyboard("{ArrowDown}");
    expect(picker.getAttribute("aria-activedescendant")).toBe(
      `${picker.getAttribute("aria-controls")}-option-1`,
    );
    await user.keyboard("{Enter}");
    expect(action).toHaveBeenCalledTimes(2);
    expect(document.activeElement).toBe(picker);

    await user.click(picker);
    await user.keyboard("{Escape}");
    expect(picker.getAttribute("aria-expanded")).toBe("false");
    expect(document.activeElement).toBe(picker);
  });
});
