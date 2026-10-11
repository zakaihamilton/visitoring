// @vitest-environment jsdom
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it } from "vitest";
import { PublicHeader } from "@/app/components/PublicHeader";
import { OrganizationPicker } from "@/app/organizations/OrganizationPicker";

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
    render(
      <OrganizationPicker
        organizations={organizations}
        initialOrganizationId=""
        action={async () => {}}
      />,
    );

    const picker = screen.getByRole("combobox", { name: "Organization Select an organization" });
    await user.click(picker);
    await user.click(screen.getByRole("option", { name: "Acme" }));
    expect(picker.textContent).toContain("Acme");
    expect(document.querySelector<HTMLInputElement>('input[name="organizationId"]')?.value).toBe(
      organizations[0].organizationId,
    );

    await user.click(picker);
    await user.keyboard("{ArrowDown}{Enter}");
    expect(picker.textContent).toContain("Northwind");
    expect(document.activeElement).toBe(picker);

    await user.click(picker);
    await user.keyboard("{Escape}");
    expect(picker.getAttribute("aria-expanded")).toBe("false");
    expect(document.activeElement).toBe(picker);
  });
});
