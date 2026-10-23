import { describe, expect, it } from "vitest";
import { parseEnvelope } from "@/lib/collect-envelope";

describe("collector envelope validation", () => {
  it("accepts generic events and sanitizes their paths and referrers", () => {
    expect(
      parseEnvelope({
        visitorId: "visitor-1234",
        sessionId: "session-123456",
        eventName: "signup",
        path: "/?query=removed",
        referrerHost: "https://ref.example/a",
        properties: { plan: "starter" },
      }),
    ).toMatchObject({
      visitorId: "visitor-1234",
      sessionId: "session-123456",
      eventName: "signup",
      path: "/",
      referrerHost: "ref.example",
      properties: { plan: "starter" },
    });
  });

  it("rejects malformed visitor IDs and envelopes without generic field names", () => {
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
        sessionId: "session-123456",
        path: "/",
      }),
    ).toBeNull();
  });

  it("rejects deeply nested or overlong property keys while allowing shallow structured properties", () => {
    expect(
      parseEnvelope({
        visitorId: "visitor-1234",
        sessionId: "session-123456",
        eventName: "signup",
        path: "/",
        properties: {
          plan: "starter",
          details: { source: "pricing", step: 2 },
          labels: ["guided", "annual"],
        },
      }),
    ).not.toBeNull();

    expect(
      parseEnvelope({
        visitorId: "visitor-1234",
        sessionId: "session-123456",
        eventName: "signup",
        path: "/",
        properties: {
          a: { b: { c: { d: "too-deep" } } },
        },
      }),
    ).toBeNull();

    expect(
      parseEnvelope({
        visitorId: "visitor-1234",
        sessionId: "session-123456",
        eventName: "signup",
        path: "/",
        properties: {
          ["k".repeat(65)]: "value",
        },
      }),
    ).toBeNull();
  });
});
