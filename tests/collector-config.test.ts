import { afterAll, beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({ db: {} }));

vi.mock("@/db", () => ({ db: mocks.db }));

import { POST } from "@/app/api/collect/route";

const originalEnvironment = {
  nodeEnv: process.env.NODE_ENV,
  secret: process.env.RATE_LIMIT_SECRET,
  limit: process.env.COLLECTOR_RATE_LIMIT_MAX_EVENTS,
};

afterAll(() => {
  if (originalEnvironment.nodeEnv === undefined) Reflect.deleteProperty(process.env, "NODE_ENV");
  else Reflect.set(process.env, "NODE_ENV", originalEnvironment.nodeEnv);
  if (originalEnvironment.secret === undefined) delete process.env.RATE_LIMIT_SECRET;
  else process.env.RATE_LIMIT_SECRET = originalEnvironment.secret;
  if (originalEnvironment.limit === undefined) delete process.env.COLLECTOR_RATE_LIMIT_MAX_EVENTS;
  else process.env.COLLECTOR_RATE_LIMIT_MAX_EVENTS = originalEnvironment.limit;
});

beforeEach(() => {
  Reflect.set(process.env, "NODE_ENV", "production");
  process.env.RATE_LIMIT_SECRET = "s".repeat(32);
  process.env.COLLECTOR_RATE_LIMIT_MAX_EVENTS = "not-a-number";
});

describe("collector configuration errors", () => {
  it("returns 503 before touching the database when the event cap is invalid", async () => {
    const response = await POST(
      new Request("https://visitoring.example/api/collect", {
        method: "POST",
        headers: { origin: "https://site.example", "content-type": "text/plain" },
        body: "{}",
      }),
    );

    expect(response.status).toBe(503);
    expect(await response.json()).toEqual({ error: "Collection is temporarily unavailable." });
  });

  it("returns 503 rather than using a predictable production secret", async () => {
    delete process.env.COLLECTOR_RATE_LIMIT_MAX_EVENTS;
    delete process.env.RATE_LIMIT_SECRET;
    const response = await POST(
      new Request("https://visitoring.example/api/collect", { method: "POST", body: "{}" }),
    );

    expect(response.status).toBe(503);
  });
});
