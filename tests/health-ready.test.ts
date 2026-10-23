import { afterAll, beforeAll, beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({ query: vi.fn() }));

vi.mock("@/db", () => ({ pool: { query: mocks.query } }));

import { GET as getRetentionCron } from "@/app/api/cron/retention/route";
import { GET } from "@/app/api/health/ready/route";
import nextConfig from "../next.config";

const environmentKeys = [
  "NODE_ENV",
  "TRUST_PROXY_HEADERS",
  "RATE_LIMIT_SECRET",
  "COLLECTOR_RATE_LIMIT_MAX_EVENTS",
] as const;
const originalEnvironment = new Map(environmentKeys.map((key) => [key, process.env[key]] as const));

beforeAll(() => {
  Reflect.set(process.env, "NODE_ENV", "production");
});

afterAll(() => {
  for (const key of environmentKeys) {
    const value = originalEnvironment.get(key);
    if (value === undefined && key === "NODE_ENV") Reflect.deleteProperty(process.env, key);
    else if (value === undefined) delete process.env[key];
    else if (key === "NODE_ENV") Reflect.set(process.env, key, value);
    else process.env[key] = value;
  }
});

beforeEach(() => {
  Reflect.set(process.env, "NODE_ENV", "production");
  process.env.TRUST_PROXY_HEADERS = "true";
  process.env.RATE_LIMIT_SECRET = "s".repeat(32);
  delete process.env.COLLECTOR_RATE_LIMIT_MAX_EVENTS;
  mocks.query.mockReset().mockResolvedValue({ rows: [], rowCount: 1 });
});

describe("readiness configuration checks", () => {
  it("fails readiness when the production HMAC secret is missing or too short", async () => {
    delete process.env.RATE_LIMIT_SECRET;
    const missing = await GET();
    expect(missing.status).toBe(503);
    expect(await missing.json()).toMatchObject({ reason: "rate_limit_secret_invalid" });

    process.env.RATE_LIMIT_SECRET = "short";
    const short = await GET();
    expect(short.status).toBe(503);
    expect(await short.json()).toMatchObject({ reason: "rate_limit_secret_invalid" });
    expect(mocks.query).not.toHaveBeenCalled();
  });

  it("fails readiness for an invalid event cap and succeeds with valid settings", async () => {
    process.env.COLLECTOR_RATE_LIMIT_MAX_EVENTS = "1.5";
    const invalid = await GET();
    expect(invalid.status).toBe(503);
    expect(await invalid.json()).toMatchObject({ reason: "collector_rate_limit_invalid" });
    expect(mocks.query).not.toHaveBeenCalled();

    process.env.COLLECTOR_RATE_LIMIT_MAX_EVENTS = "240";
    const ready = await GET();
    expect(ready.status).toBe(200);
    expect(await ready.json()).toEqual({ status: "ready", database: "connected" });
    expect(mocks.query).toHaveBeenCalledWith("select 1");
  });

  it("rejects unauthorized cron requests and configures baseline security headers", async () => {
    const previousCronSecret = process.env.CRON_SECRET;
    try {
      process.env.CRON_SECRET = "cron-secret-value";
      const missingHeader = await getRetentionCron(
        new Request("http://localhost/api/cron/retention"),
      );
      expect(missingHeader.status).toBe(401);

      const wrongSecret = await getRetentionCron(
        new Request("http://localhost/api/cron/retention", {
          headers: { authorization: "Bearer wrong-secret" },
        }),
      );
      expect(wrongSecret.status).toBe(401);
    } finally {
      if (previousCronSecret === undefined) delete process.env.CRON_SECRET;
      else process.env.CRON_SECRET = previousCronSecret;
    }

    const headerRules = await nextConfig.headers?.();
    expect(headerRules).toEqual([
      {
        source: "/:path*",
        headers: expect.arrayContaining([
          { key: "X-Content-Type-Options", value: "nosniff" },
          { key: "X-Frame-Options", value: "DENY" },
          { key: "Content-Security-Policy", value: "frame-ancestors 'none'" },
          { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
        ]),
      },
    ]);
  });
});
