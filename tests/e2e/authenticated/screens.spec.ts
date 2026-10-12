import AxeBuilder from "@axe-core/playwright";
import { expect, test, type Page, type TestInfo } from "@playwright/test";

const sizes = [
  { name: "desktop-1280x800", width: 1280, height: 800 },
  { name: "mobile-390x844", width: 390, height: 844 },
] as const;

const screens = ["dashboard", "sites", "users"] as const;
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
  if (screen === "dashboard") {
    await page.goto("/dashboard?from=2026-10-01&to=2026-10-31");
    await expect(page.getByRole("heading", { name: "Recent events" })).toBeVisible();
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

      if (screen === "dashboard") {
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
