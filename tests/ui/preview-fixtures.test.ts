import { expect, it } from "vitest";
import { scenarios } from "@/app/ui-preview/fixtures";

it("keeps additive chart buckets consistent with the displayed totals", () => {
  const { data } = scenarios.populated;
  for (const key of ["total", "pageViews", "customEvents"] as const) {
    expect(data.trend.reduce((sum, bucket) => sum + bucket.current[key], 0)).toBe(data[key]);
    expect(data.trend.reduce((sum, bucket) => sum + bucket.previous[key], 0)).toBe(
      data.previous[key],
    );
  }
});
