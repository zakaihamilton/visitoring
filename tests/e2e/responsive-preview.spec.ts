import { expect, test } from "@playwright/test";

const viewportWidths = [320, 390, 768, 1024, 1280] as const;
const themes = ["light", "dark"] as const;
const previewURL = "/ui-preview?screen=traffic&scenario=long-names";

type Box = {
  name: string;
  x: number;
  y: number;
  right: number;
  bottom: number;
  width: number;
  height: number;
};

test("synthetic dashboard stays responsive across widths and themes", async ({ page }) => {
  const backgrounds = new Map<(typeof themes)[number], string>();

  for (const theme of themes) {
    await page.emulateMedia({ colorScheme: theme });

    for (const width of viewportWidths) {
      await page.setViewportSize({ width, height: 900 });
      await page.goto(previewURL);
      await expect(page.locator(".ui-preview-toolbar")).toBeVisible();
      await expect(page.locator(".pf-dashboard-toolbar")).toBeVisible();
      await expect(page.getByRole("heading", { name: "Traffic, at a glance." })).toBeVisible();
      await expect(
        page.locator(".ui-preview-toolbar__controls .ui-preview-dropdown__value").nth(1),
      ).toHaveText("Long project and URL names");

      const dropdownHeights = await page
        .locator(".ui-preview-toolbar__controls .ui-preview-dropdown__trigger")
        .evaluateAll((triggers) =>
          triggers.map((trigger) => trigger.getBoundingClientRect().height),
        );
      expect(dropdownHeights, `${theme} theme at ${width}px: preview dropdowns`).toHaveLength(2);
      expect(
        Math.max(...dropdownHeights) - Math.min(...dropdownHeights),
        `${theme} theme at ${width}px: same-row dropdown heights`,
      ).toBeLessThanOrEqual(1);

      const layout = await page.evaluate(() => {
        const rect = (name: string, element: Element): Box => {
          const bounds = element.getBoundingClientRect();
          return {
            name,
            x: bounds.x,
            y: bounds.y,
            right: bounds.right,
            bottom: bounds.bottom,
            width: bounds.width,
            height: bounds.height,
          };
        };
        const visibleRects = (selector: string, parent: Element): Box[] =>
          Array.from(parent.querySelectorAll(selector))
            .filter((element) => {
              const style = getComputedStyle(element);
              const bounds = element.getBoundingClientRect();
              return (
                style.display !== "none" &&
                style.visibility !== "hidden" &&
                bounds.width > 0 &&
                bounds.height > 0
              );
            })
            .map((element, index) => rect(`${selector}[${index}]`, element));
        const previewToolbar = document.querySelector<HTMLElement>(".ui-preview-toolbar");
        const dashboardToolbar = document.querySelector<HTMLElement>(".pf-dashboard-toolbar");
        const shellContent = document.querySelector<HTMLElement>(".pf-dashboard-content");
        const pageContent = document.querySelector<HTMLElement>("#pf-main-content > main");
        const pageHeader = pageContent?.firstElementChild;
        if (!previewToolbar || !dashboardToolbar || !shellContent || !pageContent || !pageHeader) {
          throw new Error("The synthetic dashboard preview is missing a layout landmark.");
        }

        const previewStyle = getComputedStyle(previewToolbar);
        const dashboardStyle = getComputedStyle(dashboardToolbar);
        const shellContentStyle = getComputedStyle(shellContent);
        const pageContentStyle = getComputedStyle(pageContent);
        const bodyStyle = getComputedStyle(document.body);
        const previewItemsSelector = [
          ":scope > .ui-preview-toolbar__identity",
          ":scope > .ui-preview-toolbar__controls",
          ":scope > .ui-preview-toolbar__utilities",
          ":scope > .ui-preview-toolbar__note",
        ].join(", ");
        const previewItems = visibleRects(
          previewItemsSelector,
          previewToolbar,
        );
        const dashboardItems = visibleRects(
          ":scope > .pf-mobile-menu-button, :scope > .pf-toolbar-content",
          dashboardToolbar,
        );
        const pageHeaderItems = Array.from(pageHeader.children).map((element, index) =>
          rect(`page heading item ${index + 1}`, element),
        );
        const pageHeaderStyle = getComputedStyle(pageHeader);

        return {
          viewportWidth: window.innerWidth,
          documentScrollWidth: document.documentElement.scrollWidth,
          bodyScrollWidth: document.body.scrollWidth,
          background: bodyStyle.backgroundColor,
          previewToolbar: rect("preview toolbar", previewToolbar),
          dashboardToolbar: rect("dashboard toolbar", dashboardToolbar),
          previewItems,
          dashboardItems,
          pageHeaderItems,
          mobileMenu: rect(
            "mobile menu button",
            dashboardToolbar.querySelector(".pf-mobile-menu-button")!,
          ),
          dashboardTitle: rect(
            "dashboard toolbar title",
            dashboardToolbar.querySelector(".pf-toolbar-title")!,
          ),
          pageContent: rect("dashboard page content", pageContent),
          previewPaddingLeft: Number.parseFloat(previewStyle.paddingLeft),
          previewPaddingRight: Number.parseFloat(previewStyle.paddingRight),
          previewPaddingTop: Number.parseFloat(previewStyle.paddingTop),
          dashboardPaddingLeft: Number.parseFloat(dashboardStyle.paddingLeft),
          dashboardPaddingRight: Number.parseFloat(dashboardStyle.paddingRight),
          shellPaddingLeft: Number.parseFloat(shellContentStyle.paddingLeft),
          shellPaddingRight: Number.parseFloat(shellContentStyle.paddingRight),
          shellMarginLeft: Number.parseFloat(shellContentStyle.marginLeft),
          shellMarginRight: Number.parseFloat(shellContentStyle.marginRight),
          pagePaddingLeft: Number.parseFloat(pageContentStyle.paddingLeft),
          pagePaddingRight: Number.parseFloat(pageContentStyle.paddingRight),
          pagePaddingTop: Number.parseFloat(pageContentStyle.paddingTop),
          pagePaddingBottom: Number.parseFloat(pageContentStyle.paddingBottom),
          pageMarginLeft: Number.parseFloat(pageContentStyle.marginLeft),
          pageMarginRight: Number.parseFloat(pageContentStyle.marginRight),
          pageMarginTop: Number.parseFloat(pageContentStyle.marginTop),
          pageMarginBottom: Number.parseFloat(pageContentStyle.marginBottom),
          pageHeaderMarginBottom: Number.parseFloat(pageHeaderStyle.marginBottom),
        };
      });

      const context = `${theme} theme at ${width}px`;
      expect(layout.viewportWidth, context).toBe(width);
      expect(
        layout.documentScrollWidth,
        `${context}: document horizontal overflow`,
      ).toBeLessThanOrEqual(width);
      expect(layout.bodyScrollWidth, `${context}: body horizontal overflow`).toBeLessThanOrEqual(
        width,
      );
      backgrounds.set(theme, layout.background);

      const expectedPreviewPadding = width <= 560 ? 12 : 20;
      const expectedDashboardPadding =
        width <= 780 ? 14 : Math.min(42, Math.max(18, width * 0.03));
      const expectedPagePadding = Math.min(68, Math.max(18, width * 0.05));
      expect(layout.previewPaddingLeft, `${context}: preview left padding`).toBe(
        expectedPreviewPadding,
      );
      expect(layout.previewPaddingRight, `${context}: preview right padding`).toBe(
        expectedPreviewPadding,
      );
      expect(layout.previewPaddingTop, `${context}: preview vertical padding`).toBe(
        width <= 560 ? 12 : 14,
      );
      expect(layout.dashboardPaddingLeft, `${context}: dashboard header left padding`).toBeCloseTo(
        expectedDashboardPadding,
        1,
      );
      expect(
        layout.dashboardPaddingRight,
        `${context}: dashboard header right padding`,
      ).toBeCloseTo(expectedDashboardPadding, 1);
      expect(layout.shellPaddingLeft, `${context}: shell left padding`).toBe(0);
      expect(layout.shellPaddingRight, `${context}: shell right padding`).toBe(0);
      expect(layout.shellMarginLeft, `${context}: shell left margin`).toBe(0);
      expect(layout.shellMarginRight, `${context}: shell right margin`).toBe(0);
      expect(layout.pagePaddingLeft, `${context}: page content left padding`).toBeCloseTo(
        expectedPagePadding,
        1,
      );
      expect(layout.pagePaddingRight, `${context}: page content right padding`).toBeCloseTo(
        expectedPagePadding,
        1,
      );
      expect(layout.pagePaddingTop, `${context}: page content top padding`).toBe(
        width <= 760 ? 30 : 42,
      );
      expect(layout.pagePaddingBottom, `${context}: page content bottom padding`).toBe(46);
      expect(layout.pageMarginLeft, `${context}: centered page content`).toBe(
        layout.pageMarginRight,
      );
      expect(layout.pageMarginTop, `${context}: page content top margin`).toBe(0);
      expect(layout.pageMarginBottom, `${context}: page content bottom margin`).toBe(0);
      expect(layout.pageHeaderMarginBottom, `${context}: page heading bottom margin`).toBe(
        width <= 760 ? 17 : 25,
      );

      for (const box of [
        layout.previewToolbar,
        ...layout.previewItems,
        ...layout.dashboardItems,
        ...layout.pageHeaderItems,
      ]) {
        expect(box.x, `${context}: ${box.name} begins inside the viewport`).toBeGreaterThanOrEqual(
          -0.5,
        );
        expect(box.right, `${context}: ${box.name} ends inside the viewport`).toBeLessThanOrEqual(
          width + 0.5,
        );
      }

      for (const [headerName, boxes] of [
        ["preview header", layout.previewItems],
        ["dashboard header", layout.dashboardItems],
        ["traffic page heading", layout.pageHeaderItems],
      ] as const) {
        for (let leftIndex = 0; leftIndex < boxes.length; leftIndex += 1) {
          for (let rightIndex = leftIndex + 1; rightIndex < boxes.length; rightIndex += 1) {
            const left = boxes[leftIndex];
            const right = boxes[rightIndex];
            const overlaps =
              Math.min(left.right, right.right) - Math.max(left.x, right.x) > 1 &&
              Math.min(left.bottom, right.bottom) - Math.max(left.y, right.y) > 1;
            expect(
              overlaps,
              `${context}: ${headerName} ${left.name} overlaps ${right.name}`,
            ).toBe(false);
          }
        }
      }

      if (width <= 780) {
        const menuCenter = layout.mobileMenu.y + layout.mobileMenu.height / 2;
        const titleCenter = layout.dashboardTitle.y + layout.dashboardTitle.height / 2;
        expect(
          Math.abs(menuCenter - titleCenter),
          `${context}: dashboard title stays in the header row`,
        ).toBeLessThanOrEqual(1);
      }
    }
  }

  expect(backgrounds.get("light"), "light and dark modes render distinct surfaces").not.toBe(
    backgrounds.get("dark"),
  );
});
