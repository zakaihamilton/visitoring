// @vitest-environment jsdom
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it } from "vitest";
import { PublicHeader } from "@/app/components/PublicHeader";

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
