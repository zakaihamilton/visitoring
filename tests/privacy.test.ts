import { describe, expect, it } from "vitest";
import { coarseGeo, parseAttribution, parseUserAgent, lookupGeo } from "@/lib/attribution";
import { allowsRateLimitCount, isDoNotTrack } from "@/lib/collection-policy";
import { originIsAllowed, parseAllowedDomains } from "@/lib/domains";
import { cleanPath, cleanReferrerHost } from "@/lib/privacy";
import { retentionCutoff } from "@/lib/retention";

describe("privacy and policy helpers", () => {
  it("removes query strings from paths and keeps only referrer hostnames", () => {
    expect(cleanPath("/pricing?utm_campaign=private#top")).toBe("/pricing");
    expect(cleanReferrerHost("https://news.example/path?q=secret")).toBe("news.example");
    expect(cleanReferrerHost("not a hostname/with spaces")).toBeNull();
  });

  it("normalizes site allowlists and accepts only explicitly allowed origins", () => {
    expect(parseAllowedDomains("example.com, docs.example.com")).toEqual([
      "example.com",
      "docs.example.com",
    ]);
    expect(originIsAllowed("https://example.com", ["example.com"])).toBe(true);
    expect(originIsAllowed("https://evil.example", ["example.com"])).toBe(false);
    expect(originIsAllowed(null, ["example.com"])).toBe(false);
  });

  it("honors Do Not Track and applies the per-site/IP event cap", () => {
    expect(isDoNotTrack("1")).toBe(true);
    expect(isDoNotTrack("0")).toBe(false);
    expect(allowsRateLimitCount(120)).toBe(true);
    expect(allowsRateLimitCount(121)).toBe(false);
  });

  it("stores only coarse Bowser categories and keeps ingest usable without a GeoIP file", async () => {
    expect(
      parseUserAgent(
        "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 Chrome/131.0.0.0 Safari/537.36",
      ),
    ).toEqual({ device: "desktop", browser: "chrome", os: "windows" });
    process.env.GEOIP_DB_PATH = "/visitoring-test/missing.mmdb";
    expect(await lookupGeo("203.0.113.7")).toEqual({ country: null, region: null });
    expect(await parseAttribution("203.0.113.7", null)).toEqual({
      device: null,
      browser: null,
      os: null,
      country: null,
      region: null,
    });
  });

  it("reduces a DB-IP City Lite response to country and first-level region codes", () => {
    expect(
      coarseGeo({
        country: { iso_code: "USA" },
        subdivisions: [{ iso_code: "US-CA" }, { iso_code: "ignored-subdivision" }],
      }),
    ).toEqual({ country: "US", region: "US-CA" });
  });

  it("uses the rolling retention cutoff", () => {
    const cutoff = retentionCutoff(new Date("2026-10-31T12:00:00.000Z"), 1);
    expect(cutoff.toISOString()).toBe("2026-09-30T12:00:00.000Z");
  });
});
