// @vitest-environment jsdom
import { render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { expect, it } from "vitest";
import { TrackerSection } from "@/app/developers/components/TrackerSection";

it("shows the event example for the selected integration in the event section", async () => {
  const user = userEvent.setup();
  const { container } = render(<TrackerSection />);
  const events = container.querySelector("#events");
  expect(events).not.toBeNull();
  expect(within(events as HTMLElement).getByText(/window\.Visitoring\.track/)).toBeDefined();

  await user.click(screen.getByRole("tab", { name: "React app" }));
  expect(within(events as HTMLElement).getByText(/useVisitoring/)).toBeDefined();
  expect(within(events as HTMLElement).queryByText(/window\.Visitoring\.track/)).toBeNull();

  await user.click(screen.getByRole("tab", { name: "Standard website" }));
  expect(within(events as HTMLElement).getByText(/window\.Visitoring\.track/)).toBeDefined();
});
