/** @vitest-environment jsdom */

import { cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react";
import { StrictMode } from "react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { VisitoringProvider, useVisitoring } from "../packages/react/src/index";

function EventProbe() {
  const { status, track } = useVisitoring();
  return (
    <>
      <output aria-label="tracker status">{status}</output>
      <button type="button" onClick={() => track("signup", { plan: "starter" })}>
        Track signup
      </button>
      <button type="button" onClick={() => track("checkout", { total: 42 })}>
        Track checkout
      </button>
    </>
  );
}

function QueueProbe() {
  const { track } = useVisitoring();
  let index = 0;
  return (
    <button
      type="button"
      onClick={() => {
        track("queued", { index });
        index += 1;
      }}
    >
      Queue event
    </button>
  );
}

function trackerScript(): HTMLScriptElement {
  const script = document.querySelector<HTMLScriptElement>("#visitoring-react-tracker");
  if (!script) throw new Error("Visitoring tracker script was not injected.");
  return script;
}

function completeTrackerLoad(track = vi.fn()) {
  window.Visitoring = { track };
  trackerScript().dispatchEvent(new Event("load"));
  return track;
}

function clearLoaderState() {
  const targetWindow = window as Window & { __visitoringReactLoaderV1?: unknown };
  delete targetWindow.__visitoringReactLoaderV1;
  document.getElementById("visitoring-react-tracker")?.remove();
  delete window.Visitoring;
}

describe("visitoring React integration", () => {
  beforeEach(() => {
    clearLoaderState();
  });

  afterEach(() => {
    cleanup();
    clearLoaderState();
    vi.restoreAllMocks();
  });

  it("queues events in order and loads only one tracker in Strict Mode", async () => {
    render(
      <StrictMode>
        <VisitoringProvider
          siteKey="vk_react_test"
          scriptUrl="https://analytics.example.com/tracker.js"
          endpoint="https://events.example.com/api/collect"
        >
          <EventProbe />
        </VisitoringProvider>
      </StrictMode>,
    );

    expect(screen.getByLabelText("tracker status").textContent).toBe("loading");
    fireEvent.click(screen.getByRole("button", { name: "Track signup" }));
    fireEvent.click(screen.getByRole("button", { name: "Track checkout" }));
    expect(document.querySelectorAll("#visitoring-react-tracker")).toHaveLength(1);
    expect(trackerScript().src).toBe("https://analytics.example.com/tracker.js");
    expect(trackerScript().dataset.siteKey).toBe("vk_react_test");
    expect(trackerScript().dataset.endpoint).toBe("https://events.example.com/api/collect");

    const track = completeTrackerLoad();
    await waitFor(() => expect(screen.getByLabelText("tracker status").textContent).toBe("ready"));

    expect(track).toHaveBeenNthCalledWith(1, "signup", { plan: "starter" });
    expect(track).toHaveBeenNthCalledWith(2, "checkout", { total: 42 });
    fireEvent.click(screen.getByRole("button", { name: "Track signup" }));
    expect(track).toHaveBeenNthCalledWith(3, "signup", { plan: "starter" });
  });

  it("caps the pending queue at 100 events and drops newer events", async () => {
    render(
      <VisitoringProvider siteKey="vk_react_test">
        <QueueProbe />
      </VisitoringProvider>,
    );

    const button = screen.getByRole("button", { name: "Queue event" });
    for (let index = 0; index < 101; index += 1) fireEvent.click(button);
    const track = completeTrackerLoad();

    await waitFor(() => expect(track).toHaveBeenCalledTimes(100));
    expect(track).toHaveBeenNthCalledWith(1, "queued", { index: 0 });
    expect(track).toHaveBeenNthCalledWith(100, "queued", { index: 99 });
  });

  it("clears queued events and exposes an error when the script fails", async () => {
    const log = vi.spyOn(console, "error").mockImplementation(() => undefined);
    render(
      <VisitoringProvider siteKey="vk_react_test">
        <EventProbe />
      </VisitoringProvider>,
    );
    fireEvent.click(screen.getByRole("button", { name: "Track signup" }));

    trackerScript().dispatchEvent(new Event("error"));
    await waitFor(() => expect(screen.getByLabelText("tracker status").textContent).toBe("error"));
    expect(log).toHaveBeenCalled();
  });

  it("reports conflicting site configurations without injecting a second tracker", async () => {
    const log = vi.spyOn(console, "error").mockImplementation(() => undefined);
    render(
      <>
        <VisitoringProvider siteKey="vk_first_site">
          <EventProbe />
        </VisitoringProvider>
        <VisitoringProvider siteKey="vk_second_site">
          <EventProbe />
        </VisitoringProvider>
      </>,
    );

    await waitFor(() => {
      expect(screen.getAllByLabelText("tracker status").map((item) => item.textContent)).toContain(
        "error",
      );
    });
    expect(document.querySelectorAll("#visitoring-react-tracker")).toHaveLength(1);
    expect(log).toHaveBeenCalled();
  });

  it("does not inject another tracker when the plain script integration is present", async () => {
    const log = vi.spyOn(console, "error").mockImplementation(() => undefined);
    const plainScript = document.createElement("script");
    plainScript.src = "https://visitoring.vercel.app/tracker.js";
    plainScript.dataset.siteKey = "vk_react_test";
    document.head.appendChild(plainScript);

    render(
      <VisitoringProvider siteKey="vk_react_test">
        <EventProbe />
      </VisitoringProvider>,
    );

    await waitFor(() => expect(screen.getByLabelText("tracker status").textContent).toBe("error"));
    expect(document.querySelectorAll("script[data-site-key]")).toHaveLength(1);
    expect(document.getElementById("visitoring-react-tracker")).toBeNull();
    expect(log).toHaveBeenCalled();
  });
});
