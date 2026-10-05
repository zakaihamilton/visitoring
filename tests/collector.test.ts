import { describe, expect, it } from "vitest";
import { parseEnvelope } from "@/lib/collect-envelope";

describe("collector envelope validation", () => {
  it("accepts the Sentry8 shape and preserves the five legacy event payload contracts", () => {
    const names = [
      ["welcome_view", {}],
      ["welcome_cta_click", { target: "demo", placement: "hero" }],
      ["welcome_scroll_depth", { depth: 50 }],
      ["welcome_section_view", { section: "regulations" }],
      ["welcome_regulation_tab", { regulation: "eu-ai-act" }],
    ] as const;
    for (const [event, properties] of names) {
      expect(
        parseEnvelope({
          event,
          anonymousId: "anonymous-1234",
          sessionId: "session-123456",
          path: "/?query=removed",
          referrerHost: "https://ref.example/a",
          properties,
        }),
      ).toMatchObject({
        visitorId: "anonymous-1234",
        sessionId: "session-123456",
        eventName: event,
        path: "/",
        referrerHost: "ref.example",
        properties,
      });
    }
  });

  it("accepts generic events but rejects malformed anonymous IDs and legacy payloads", () => {
    expect(
      parseEnvelope({
        visitorId: "visitor-12345",
        sessionId: "session-123456",
        eventName: "trial_started",
        path: "/signup?email=secret",
        properties: { plan: "starter" },
      }),
    ).toMatchObject({ eventName: "trial_started", path: "/signup" });
    expect(
      parseEnvelope({
        visitorId: "tiny",
        sessionId: "session-12345",
        eventName: "page_view",
        path: "/",
      }),
    ).toBeNull();
    expect(
      parseEnvelope({
        event: "welcome_cta_click",
        anonymousId: "anonymous-1234",
        sessionId: "session-123456",
        path: "/",
        properties: { target: "unknown", placement: "hero" },
      }),
    ).toBeNull();
  });
});
