import { defineConfig, devices } from "@playwright/test";

// Keep the callback and app on one hostname so the loopback SSO cookie is sent.
const baseURL = process.env.PLAYWRIGHT_AUTH_BASE_URL ?? "http://localhost:3115";

export default defineConfig({
  testDir: "./tests/e2e/authenticated",
  outputDir: "./test-results/authenticated-ui",
  fullyParallel: false,
  retries: process.env.CI ? 1 : 0,
  reporter: "list",
  use: { baseURL, trace: "retain-on-failure", screenshot: "only-on-failure" },
  projects: [{ name: "chromium", use: { ...devices["Desktop Chrome"] } }],
  webServer: {
    command: "npx tsx tests/e2e/support/authenticated-ui-server.ts",
    url: baseURL,
    reuseExistingServer: false,
    timeout: 240_000,
  },
});
