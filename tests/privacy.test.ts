import { describe, expect, it } from "vitest";
import { coarseGeo, parseAttribution, parseUserAgent, lookupGeo } from "@/lib/attribution";
import {
  allowsRateLimitCount,
  collectorRateLimitConfigurationError,
  collectorRateLimitMaxEvents,
  isDoNotTrack,
} from "@/lib/collection-policy";
import { hashRateLimitKey, rateLimitSecretConfigurationError } from "@/lib/crypto";
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
    const previousLimit = process.env.COLLECTOR_RATE_LIMIT_MAX_EVENTS;
    try {
      delete process.env.COLLECTOR_RATE_LIMIT_MAX_EVENTS;
      expect(collectorRateLimitMaxEvents()).toBe(120);
      expect(allowsRateLimitCount(120)).toBe(true);
      expect(allowsRateLimitCount(121)).toBe(false);

      process.env.COLLECTOR_RATE_LIMIT_MAX_EVENTS = "7";
      expect(collectorRateLimitConfigurationError()).toBeNull();
      expect(collectorRateLimitMaxEvents()).toBe(7);
      expect(allowsRateLimitCount(7)).toBe(true);
      expect(allowsRateLimitCount(8)).toBe(false);

      process.env.COLLECTOR_RATE_LIMIT_MAX_EVENTS = "0";
      expect(collectorRateLimitConfigurationError()).toContain("positive integer");
      process.env.COLLECTOR_RATE_LIMIT_MAX_EVENTS = "2147483647";
      expect(collectorRateLimitConfigurationError()).toContain("must not exceed");
    } finally {
      if (previousLimit === undefined) delete process.env.COLLECTOR_RATE_LIMIT_MAX_EVENTS;
      else process.env.COLLECTOR_RATE_LIMIT_MAX_EVENTS = previousLimit;
    }
  });

  it("requires a long rate-limit secret in production and refuses to hash with the fallback", () => {
    const previousEnvironment = process.env.NODE_ENV;
    const previousSecret = process.env.RATE_LIMIT_SECRET;
    Reflect.set(process.env, "NODE_ENV", "production");
    Reflect.deleteProperty(process.env, "RATE_LIMIT_SECRET");
    try {
      expect(rateLimitSecretConfigurationError()).toContain("at least 32 UTF-8 bytes");
      expect(() => hashRateLimitKey("ip:203.0.113.7")).toThrow("RATE_LIMIT_SECRET");

      process.env.RATE_LIMIT_SECRET = "s".repeat(32);
      expect(rateLimitSecretConfigurationError()).toBeNull();
      expect(hashRateLimitKey("ip:203.0.113.7")).toMatch(/^[a-f0-9]{64}$/);
    } finally {
      if (previousEnvironment === undefined) Reflect.deleteProperty(process.env, "NODE_ENV");
      else Reflect.set(process.env, "NODE_ENV", previousEnvironment);
      if (previousSecret === undefined) delete process.env.RATE_LIMIT_SECRET;
      else process.env.RATE_LIMIT_SECRET = previousSecret;
    }
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
