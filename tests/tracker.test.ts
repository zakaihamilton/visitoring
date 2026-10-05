import { describe, expect, it } from "vitest";
import { GET } from "@/app/tracker.js/route";

describe("browser tracker", () => {
  it("keeps stable Sentry8 IDs, captures page views and SPA navigation, exposes custom events, and does not block", async () => {
    const source = await GET().text();
    expect(source).toContain("sentry8-telemetry-visitor-id");
    expect(source).toContain("sentry8-telemetry-session-id");
    expect(source).toContain("send('page_view', {})");
    expect(source).toContain("window.Visitoring.track");
    expect(source).toContain("'pushState'");
    expect(source).toContain("'replaceState'");
    expect(source).toContain("addEventListener('popstate'");
    expect(source).toContain("navigator.sendBeacon");
    expect(source).toContain("keepalive: true");
    expect(source).toContain("navigator.doNotTrack === '1'");
  });
});
