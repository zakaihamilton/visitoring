// @vitest-environment jsdom
import { render } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { PropertyText } from "@/app/dashboard/components/RecentEventsTable";

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
