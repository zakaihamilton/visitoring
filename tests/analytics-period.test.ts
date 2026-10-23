import { describe, expect, it } from "vitest";
import { analyticsPeriod, dashboardDates, metricChange } from "@/lib/analytics-period";

const now = new Date("2026-10-23T12:34:56.000Z");

describe("traffic periods", () => {
  it("matches elapsed time in the immediately preceding calendar period", () => {
    const period = analyticsPeriod("2026-09-24T00:00:00.000Z", "2026-10-23T23:59:59.999Z", now);
    expect(period).toMatchObject({
      from: "2026-09-24T00:00:00.000Z",
      to: now.toISOString(),
      previousFrom: "2026-08-25T00:00:00.000Z",
      previousTo: "2026-09-23T12:34:56.000Z",
      partial: true,
      granularity: "day",
    });
    expect(period.buckets).toHaveLength(30);
    expect(period.buckets.at(-1)?.previousTo).toBe(period.previousTo);
  });

  it("covers completed days with exclusive end boundaries and hourly buckets", () => {
    const period = analyticsPeriod("2026-10-22T00:00:00.000Z", "2026-10-22T23:59:59.999Z", now);
    expect(period).toMatchObject({
      to: "2026-10-23T00:00:00.000Z",
      previousTo: "2026-10-22T00:00:00.000Z",
      partial: false,
      granularity: "hour",
    });
    expect(period.buckets).toHaveLength(24);
    expect(period.buckets[0]?.to).toBe(period.buckets[1]?.from);
  });

  it("uses a partial final hour for today", () => {
    const period = analyticsPeriod("2026-10-23T00:00:00.000Z", "2026-10-23T23:59:59.999Z", now);
    expect(period.buckets).toHaveLength(13);
    expect(period.buckets.at(-1)?.to).toBe(now.toISOString());
    expect(period.previousTo).toBe("2026-10-22T12:34:56.000Z");
  });

  it.each([
    ["2026-07-26", "day"],
    ["2026-07-25", "week"],
    ["2025-10-24", "week"],
    ["2025-10-23", "month"],
  ] as const)("covers the entire range from %s with %s buckets", (from, granularity) => {
    const period = analyticsPeriod(`${from}T00:00:00.000Z`, "2026-10-23T23:59:59.999Z", now);
    expect(period.granularity).toBe(granularity);
    expect(period.buckets[0]?.from).toBe(period.from);
    expect(period.buckets.at(-1)?.to).toBe(period.to);
    for (let index = 1; index < period.buckets.length; index++) {
      expect(period.buckets[index]?.from).toBe(period.buckets[index - 1]?.to);
      expect(period.buckets[index]?.previousFrom).toBe(period.buckets[index - 1]?.previousTo);
    }
  });

  it("handles leap days and calendar month transitions", () => {
    const period = analyticsPeriod("2024-02-29T00:00:00.000Z", "2025-03-01T23:59:59.999Z", now);
    expect(period.granularity).toBe("month");
    expect(period.buckets[0]?.to).toBe("2024-03-01T00:00:00.000Z");
    expect(period.buckets.at(-1)?.to).toBe("2025-03-02T00:00:00.000Z");
  });

  it("validates the same clamped date boundaries shown in the filters", () => {
    expect(dashboardDates("2026-10-24", "2026-10-23", now)).toEqual({
      from: "2026-10-23",
      to: "2026-10-23",
      error: "",
    });
    expect(dashboardDates("2026-12-02", "2026-12-01", now)).toEqual({
      from: "2026-10-23",
      to: "2026-10-23",
      error: "",
    });
    expect(dashboardDates("2026-10-24", "2026-10-22", now)).toEqual({
      from: "2026-10-23",
      to: "2026-10-22",
      error: "Start date must be on or before the end date.",
    });
  });

  it("normalizes malformed and impossible dates and flags reversed ranges", () => {
    expect(dashboardDates("2026-02-30", "garbage", now)).toEqual({
      from: "2026-09-24",
      to: "2026-10-23",
      error: "",
    });
    expect(dashboardDates("2026-10-10", "2026-10-01", now).error).toMatch(/Start date/);
    expect(dashboardDates("2026-10-01", "2027-01-01", now).to).toBe("2026-10-23");
  });
});

describe("metric changes", () => {
  it.each([
    [0, 0, "No change"],
    [5, 0, "No previous activity"],
    [0, 5, "-100%"],
    [3, 2, "+50%"],
    [2, 3, "-33.3%"],
    [1, 1, "No change"],
  ])("formats %s versus %s", (current, previous, expected) => {
    expect(metricChange(Number(current), Number(previous))).toBe(expected);
  });
});
