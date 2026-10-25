import AxeBuilder from "@axe-core/playwright";
import { expect, test, type Page, type TestInfo } from "@playwright/test";

const sizes = [
  { name: "desktop-1280x800", width: 1280, height: 800 },
  { name: "mobile-390x844", width: 390, height: 844 },
] as const;

const screens = ["dashboard", "events", "chart-data", "sites", "users"] as const;
type Screen = (typeof screens)[number];

async function signIn(page: Page) {
  await page.goto("/login");
  await page.getByLabel("Email").fill("e2e-admin@example.test");
  await page.getByLabel("Password").fill("e2e-local-password");
  await page.getByRole("button", { name: "Continue" }).click();
  await expect(page).toHaveURL(/\/projects(?:\?.*)?$/);
  await page.getByRole("button", { name: /Open project/ }).click();
  await expect(page).toHaveURL(/\/dashboard$/);
}

async function openScreen(page: Page, screen: Screen) {
  if (screen === "dashboard" || screen === "events" || screen === "chart-data") {
    await page.goto(
      `${screen === "events" ? "/dashboard/events" : screen === "chart-data" ? "/dashboard/chart-data" : "/dashboard"}?from=2026-10-01&to=2026-10-31`,
    );
    await expect(
      page.getByRole("heading", {
        name:
          screen === "events"
            ? "Recent events"
            : screen === "chart-data"
              ? "Chart data"
              : "Traffic over time",
        exact: true,
      }),
    ).toBeVisible();
    return;
  }

  await page.getByRole("link", { name: "Settings" }).click();
  await expect(page).toHaveURL(/\/settings\/sites$/);
  if (screen === "users") {
    await page.getByRole("link", { name: "Users" }).click();
    await expect(page).toHaveURL(/\/settings\/users$/);
  }
}

async function captureScreen(page: Page, testInfo: TestInfo, screen: Screen, sizeName: string) {
  const path = testInfo.outputPath(`${screen}-${sizeName}.png`);
  await page.screenshot({ path, fullPage: true, animations: "disabled" });
  await testInfo.attach(`${screen}-${sizeName}`, { path, contentType: "image/png" });
}

for (const size of sizes) {
  for (const screen of screens) {
    test(`${screen} is readable and accessible at ${size.name}`, async ({ page }, testInfo) => {
      await page.setViewportSize({ width: size.width, height: size.height });
      await signIn(page);
      await openScreen(page, screen);

      if (screen === "events") {
        const eventArea = page.getByTestId("recent-events");
        await expect(eventArea).toBeVisible();
        if (size.width <= 760) {
          const mobileCards = page.getByTestId("mobile-event-cards");
          await expect(mobileCards).toBeVisible();
          await expect(page.getByTestId("desktop-events-table")).toBeHidden();
          await expect(mobileCards.getByText("+2 more properties").first()).toBeVisible();
          const hasNoOverflow = await eventArea.evaluate(
            (element) => element.scrollWidth <= element.clientWidth,
          );
          expect(hasNoOverflow, "Recent events should not scroll horizontally on mobile").toBe(
            true,
          );
          const documentHasNoOverflow = await page.evaluate(
            () => document.documentElement.scrollWidth <= window.innerWidth,
          );
          expect(documentHasNoOverflow, "The mobile page should not overflow horizontally").toBe(
            true,
          );
        } else {
          await expect(page.getByTestId("desktop-events-table")).toBeVisible();
          await expect(page.getByTestId("mobile-event-cards")).toBeHidden();
          await expect(
            page.getByTestId("desktop-events-table").getByText("+2 more properties").first(),
          ).toBeVisible();
        }
      } else if (screen === "chart-data") {
        await expect(page.getByRole("table", { name: "Visitors · UTC" })).toBeVisible();
        expect(
          await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth),
        ).toBe(true);
      } else if (screen === "dashboard") {
        await expect(page.getByTestId("recent-events")).toHaveCount(0);
        await expect(page.getByRole("link", { name: "Recent events", exact: true })).toBeVisible();
      } else if (screen === "sites") {
        await expect(page.getByRole("heading", { name: "Manage your sites" })).toBeVisible();
        await expect(page.getByRole("heading", { name: "Northwind website" })).toBeVisible();
      } else {
        await expect(page.getByRole("heading", { name: "Manage users" })).toBeVisible();
        await expect(page.getByText("viewer@example.test", { exact: true })).toBeVisible();
      }

      await captureScreen(page, testInfo, screen, size.name);
      const results = await new AxeBuilder({ page })
        .withTags(["wcag2a", "wcag2aa", "wcag21a", "wcag21aa"])
        .analyze();
      const summaries = results.violations.map((violation) => ({
        id: violation.id,
        count: violation.nodes.length,
        examples: violation.nodes.slice(0, 12).map((node) => {
          const contrast = node.any.find((check) => check.data?.fgColor);
          return `${node.target.join(" ")} (${contrast?.data?.fgColor ?? ""} on ${contrast?.data?.bgColor ?? ""})`;
        }),
      }));
      if (summaries.length) console.log(`${screen} ${size.name} axe: ${JSON.stringify(summaries)}`);
      expect(summaries, `${screen} at ${size.name} should meet WCAG A/AA`).toEqual([]);
    });
  }
}

test("traffic controls preserve scope, compare metrics, and distinguish empty states", async ({
  page,
}) => {
  await signIn(page);
  await page.goto("/dashboard?from=2026-10-01&to=2026-10-15&path=%2Fpricing");
  await page.getByRole("combobox", { name: "Metric", exact: true }).click();
  await page.getByRole("option", { name: "Page views", exact: true }).click();
  await expect(page.getByRole("region", { name: "Page views by day" })).toBeVisible();
  await page.getByRole("link", { name: "View chart data" }).click();
  await expect(page.getByRole("table", { name: "Page views · UTC" })).toBeVisible();
  await page.getByRole("link", { name: "Last 7 days" }).click();
  expect(new URL(page.url()).searchParams.get("path")).toBe("/pricing");
  await page.goto("/dashboard?from=2026-10-01&to=2026-10-15&event=does_not_exist");
  await expect(
    page.getByRole("heading", { name: "No activity matches these filters" }),
  ).toBeVisible();
  await expect(page.getByRole("region", { name: "Tracking setup guide" })).toHaveCount(0);
  await page.goto("/dashboard?site=3758c8a9-0171-43dc-b15e-d58b55b8dba9");
  await expect(page.getByRole("region", { name: "Tracking setup guide" })).toBeVisible();
  await page.goto("/dashboard?from=2026-10-15&to=2026-10-01&event=signup");
  await expect(page.locator("main").getByRole("alert")).toHaveText(
    "Start date must be on or before the end date.",
  );
  await page.getByLabel("Start date", { exact: true }).fill("2026-10-01");
  await page.getByLabel("End date", { exact: true }).fill("2026-10-15");
  await page.getByRole("button", { name: "Apply filters" }).click();
  expect(new URL(page.url()).searchParams.get("event")).toBe("signup");
  await expect(page.getByRole("heading", { name: "Traffic over time" })).toBeVisible();
});

test("traffic empty states remain accessible on mobile and honor reduced motion", async ({
  page,
}, testInfo) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await page.emulateMedia({ reducedMotion: "reduce" });
  await signIn(page);
  for (const state of [
    {
      name: "filtered-empty",
      url: "/dashboard?event=does_not_exist",
      heading: "No activity matches these filters",
    },
    {
      name: "new-site",
      url: "/dashboard?site=3758c8a9-0171-43dc-b15e-d58b55b8dba9",
      heading: "Ready to start tracking New site?",
    },
  ]) {
    await page.goto(state.url);
    await expect(page.getByRole("heading", { name: state.heading })).toBeVisible();
    expect(
      await page.locator("main").evaluate((element) => getComputedStyle(element).animationName),
    ).toBe("none");
    expect(
      await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth),
    ).toBe(true);
    const path = testInfo.outputPath(`${state.name}-mobile.png`);
    await page.screenshot({ path, fullPage: true, animations: "disabled" });
    await testInfo.attach(state.name, { path, contentType: "image/png" });
    const results = await new AxeBuilder({ page })
      .withTags(["wcag2a", "wcag2aa", "wcag21a", "wcag21aa"])
      .analyze();
    expect(results.violations).toEqual([]);
  }
});

test("traffic custom dropdown remains readable in dark mode", async ({ page }, testInfo) => {
  await page.emulateMedia({ colorScheme: "dark" });
  await signIn(page);
  await page.goto("/dashboard?from=2026-10-01&to=2026-10-15");
  await page.getByRole("combobox", { name: "Metric", exact: true }).click();
  await expect(page.getByRole("listbox", { name: "Metric options" })).toBeVisible();
  await captureScreen(page, testInfo, "dashboard", "dark-dropdown");
  const results = await new AxeBuilder({ page })
    .withTags(["wcag2a", "wcag2aa", "wcag21a", "wcag21aa"])
    .analyze();
  expect(
    results.violations.map((violation) => ({
      id: violation.id,
      nodes: violation.nodes.map((node) => node.target),
    })),
  ).toEqual([]);
  await page.getByRole("combobox", { name: "Metric", exact: true }).press("End");
  await page.getByRole("combobox", { name: "Metric", exact: true }).press("Enter");
  await expect(page.getByRole("region", { name: "Custom events by day" })).toBeVisible();
});

test("recent events navigation preserves site and filters and stays on the events page", async ({
  page,
}) => {
  await signIn(page);
  await page.goto("/dashboard?from=2026-10-01&to=2026-10-15&event=signup&path=%2Fpricing");
  await expect(page.getByTestId("recent-events")).toHaveCount(0);
  await page.getByRole("link", { name: "Recent events", exact: true }).click();
  await expect(page.getByRole("heading", { name: "Recent events", exact: true })).toBeVisible();
  const selected = new URL(page.url());
  expect(selected.pathname).toBe("/dashboard/events");
  expect(Object.fromEntries(selected.searchParams)).toMatchObject({
    from: "2026-10-01",
    to: "2026-10-15",
    event: "signup",
    path: "/pricing",
  });
  expect(selected.searchParams.get("site")).toBeTruthy();
  await expect(page.getByTestId("recent-events")).toBeVisible();
  await page.getByRole("link", { name: "Traffic overview", exact: true }).click();
  expect(new URL(page.url()).search).toBe(selected.search);
  await expect(page.getByTestId("recent-events")).toHaveCount(0);
  await page.getByRole("link", { name: "Recent events", exact: true }).click();
  await expect(page.getByRole("heading", { name: "Recent events", exact: true })).toBeVisible();
  await page.getByLabel("Page path", { exact: true }).fill("/nothing-matches");
  await page.getByRole("button", { name: "Apply filters" }).click();
  await expect(page.getByText("No events found. Try changing your filters.")).toBeVisible();
  expect(new URL(page.url()).pathname).toBe("/dashboard/events");
  await page.getByRole("link", { name: "Last 7 days", exact: true }).click();
  await expect(page).toHaveURL(
    (url) => url.pathname === "/dashboard/events" && url.searchParams.get("from") !== "2026-10-01",
  );
  expect(new URL(page.url()).pathname).toBe("/dashboard/events");
  expect(new URL(page.url()).searchParams.get("path")).toBe("/nothing-matches");
  await page.getByRole("link", { name: "Reset filters", exact: true }).click();
  await expect(page).toHaveURL(
    (url) => url.pathname === "/dashboard/events" && [...url.searchParams.keys()].join() === "site",
  );
  expect(new URL(page.url()).pathname).toBe("/dashboard/events");
  expect(new URL(page.url()).searchParams.get("event")).toBeNull();
});

test("chart data keeps the selected metric and filters across pages", async ({ page }) => {
  await signIn(page);
  await page.goto("/dashboard?from=2026-10-01&to=2026-10-15&path=%2Fpricing");
  await page.getByRole("combobox", { name: "Metric", exact: true }).click();
  await page.getByRole("option", { name: "Page views", exact: true }).click();
  await page.getByRole("link", { name: "Chart data", exact: true }).click();
  await expect(page.getByRole("heading", { name: "Chart data", exact: true })).toBeVisible();
  expect(new URL(page.url()).searchParams.get("metric")).toBe("pageViews");
  expect(new URL(page.url()).searchParams.get("path")).toBe("/pricing");
  await page.reload();
  await expect(page.getByRole("table", { name: "Page views · UTC" })).toBeVisible();
  await page.getByRole("combobox", { name: "Metric", exact: true }).click();
  await page.getByRole("option", { name: "Sessions", exact: true }).click();
  await page.getByRole("button", { name: "Apply metric" }).click();
  await expect(page.getByRole("table", { name: "Sessions · UTC" })).toBeVisible();
  expect(new URL(page.url()).searchParams.get("path")).toBe("/pricing");
  await page.getByRole("link", { name: "Traffic overview", exact: true }).click();
  await expect(page.getByRole("region", { name: "Sessions by day" })).toBeVisible();
  await expect(page.getByRole("table")).toHaveCount(0);
  await page.getByRole("link", { name: "View chart data", exact: true }).click();
  await expect(page.getByRole("heading", { name: "Chart data", exact: true })).toBeVisible();
  await page.getByRole("link", { name: "Last 7 days", exact: true }).click();
  await expect(page).toHaveURL(
    (url) =>
      url.pathname === "/dashboard/chart-data" && url.searchParams.get("from") !== "2026-10-01",
  );
  expect(new URL(page.url()).searchParams.get("metric")).toBe("sessions");
});

test("traffic mobile filters collapse, recover inline, and chart has one tab stop", async ({
  page,
}) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await signIn(page);
  await page.goto("/dashboard?from=2026-10-01&to=2026-10-15");
  await expect(page.getByLabel("Start date", { exact: true })).toBeHidden();
  const chart = page.getByRole("region", { name: "Visitors by day" });
  await expect(chart).toBeVisible();
  expect(
    (await page.getByRole("region", { name: "Traffic trend", exact: true }).boundingBox())?.y,
  ).toBeLessThan(1100);
  await expect(chart.locator('button[tabindex="0"]')).toHaveCount(1);
  await chart.locator('button[tabindex="0"]').focus();
  await page.keyboard.press("Home");
  await expect(chart.getByRole("button").first()).toBeFocused();
  await page.keyboard.press("ArrowRight");
  await expect(chart.getByRole("button").nth(1)).toBeFocused();
  await page.keyboard.press("Tab");
  await expect(page.getByRole("link", { name: "View chart data" })).toBeFocused();
  await page.getByRole("button", { name: "Edit filters" }).click();
  await expect(page.getByLabel("Start date", { exact: true })).toBeVisible();
  await page.goto("/dashboard?from=2026-10-15&to=2026-10-01&event=signup");
  await expect(page.getByRole("heading", { name: "Traffic, at a glance." })).toBeVisible();
  await expect(page.getByRole("navigation", { name: "Traffic navigation" })).toBeVisible();
  await expect(page.getByLabel("Start date", { exact: true })).toHaveAttribute(
    "aria-invalid",
    "true",
  );
  await expect(page.locator("main").getByRole("alert")).toBeVisible();
  await page.locator("main").evaluate(async (element) => {
    await Promise.all(element.getAnimations().map((animation) => animation.finished));
  });
  expect(
    (
      await new AxeBuilder({ page })
        .withTags(["wcag2a", "wcag2aa", "wcag21a", "wcag21aa"])
        .analyze()
    ).violations,
  ).toEqual([]);
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
});

test("recent events pagination preserves filters and resets after filtering", async ({ page }) => {
  await signIn(page);
  await page.goto("/dashboard/events?from=2026-09-01&to=2026-10-15&event=page_view");
  const rows = page.getByTestId("desktop-events-table").locator("tbody tr");
  await expect(rows).toHaveCount(20);
  const firstPage = await rows.allTextContents();
  await page.getByRole("link", { name: "Older events" }).click();
  await expect(page).toHaveURL((url) => url.searchParams.get("page") === "2");
  await expect(page.getByText(/Records 21–40/)).toBeVisible();
  expect(new URL(page.url()).searchParams.get("event")).toBe("page_view");
  const snapshot = new URL(page.url()).searchParams.get("before");
  expect(snapshot).toBeTruthy();
  expect(await rows.allTextContents()).not.toEqual(firstPage);
  await page.getByRole("link", { name: "Newer events" }).click();
  await expect(page.getByText(/Records 1–20/)).toBeVisible();
  expect(new URL(page.url()).searchParams.get("before")).toBe(snapshot);
  await page.getByRole("link", { name: "Older events" }).click();
  await page.getByRole("button", { name: "Refresh data", exact: true }).click();
  await expect(page).toHaveURL(
    (url) => !url.searchParams.has("before") && !url.searchParams.has("page"),
  );
  await expect(page.getByText(/Records 1–20/)).toBeVisible();
  expect(new URL(page.url()).searchParams.get("event")).toBe("page_view");
  await page.getByRole("link", { name: "Older events" }).click();
  await page.getByLabel("Page path", { exact: true }).fill("/nothing-matches");
  await page.getByRole("button", { name: "Apply filters" }).click();
  await expect(page.getByText("No events found. Try changing your filters.")).toBeVisible();
  expect(new URL(page.url()).searchParams.has("page")).toBe(false);
  expect(new URL(page.url()).searchParams.has("before")).toBe(false);
});

for (const route of ["/dashboard", "/dashboard/events", "/dashboard/chart-data"]) {
  test(`refresh updates traffic data and retains scope on ${route}`, async ({ page }, testInfo) => {
    await page.setViewportSize({ width: 390, height: 844 });
    await signIn(page);
    await page.goto(`${route}?from=2026-10-01&to=2026-10-15&metric=pageViews&path=%2Fpricing`);
    const time = page.locator("main time").first();
    await expect(time).toContainText(/^Updated [A-Z][a-z]{2} \d{1,2}, \d{4}, \d{2}:\d{2} UTC$/);
    const originalTime = await time.getAttribute("datetime");
    const originalURL = page.url();
    const button = page.getByRole("button", { name: "Refresh data", exact: true });
    await button.focus();
    await expect(page.getByRole("tooltip", { includeHidden: true })).toHaveText(
      "Refresh traffic data",
    );
    await page.keyboard.press("Escape");
    await expect(page.getByRole("tooltip", { includeHidden: true })).toHaveCount(0);
    await button.press("Enter");
    await expect.poll(() => time.getAttribute("datetime")).not.toBe(originalTime);
    await expect(button).toHaveAttribute("aria-busy", "false");
    expect(page.url()).toBe(originalURL);
    await button.hover();
    await expect(page.getByRole("tooltip", { includeHidden: true })).toHaveText(
      "Refresh traffic data",
    );
    await page.screenshot({
      path: testInfo.outputPath("refresh-tooltip-mobile.png"),
      fullPage: true,
      animations: "disabled",
    });
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(
      true,
    );
    const results = await new AxeBuilder({ page })
      .withTags(["wcag2a", "wcag2aa", "wcag21a", "wcag21aa"])
      .analyze();
    expect(results.violations).toEqual([]);
  });
}

test("traffic filters and chart metrics update without a document reload or page fade", async ({
  page,
}) => {
  await signIn(page);
  await page.goto("/dashboard?from=2026-10-01&to=2026-10-15");
  await expect(page.getByRole("heading", { name: "Traffic over time" })).toBeVisible();
  await page.evaluate(() => {
    document.documentElement.dataset.navigationMarker = "preserved";
  });
  await page.getByLabel("Page path", { exact: true }).fill("/pricing");
  await page.getByRole("button", { name: "Apply filters" }).click();
  await expect(page).toHaveURL((url) => url.searchParams.get("path") === "/pricing");
  await expect(page.getByRole("heading", { name: "Traffic over time" })).toBeVisible();
  expect(await page.evaluate(() => document.documentElement.dataset.navigationMarker)).toBe(
    "preserved",
  );
  expect(
    await page.locator("main").evaluate((element) => getComputedStyle(element).animationName),
  ).toBe("none");
  expect(await page.locator("main").evaluate((element) => getComputedStyle(element).opacity)).toBe(
    "1",
  );
  await page.getByRole("link", { name: "Chart data", exact: true }).click();
  await page.getByRole("combobox", { name: "Metric", exact: true }).click();
  await page.getByRole("option", { name: "Sessions", exact: true }).click();
  await page.getByRole("button", { name: "Apply metric" }).click();
  await expect(page.getByRole("table", { name: "Sessions · UTC" })).toBeVisible();
  expect(await page.evaluate(() => document.documentElement.dataset.navigationMarker)).toBe(
    "preserved",
  );
});
