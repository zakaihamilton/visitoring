import { defineConfig, devices } from "@playwright/test";

const baseURL = "http://127.0.0.1:3100";

export default defineConfig({
  testDir: "./tests/e2e",
  testMatch: "responsive-preview.spec.ts",
  fullyParallel: false,
  workers: 1,
  retries: process.env.CI ? 1 : 0,
  reporter: "list",
  timeout: 90_000,
  expect: { timeout: 10_000 },
  use: { baseURL, trace: "retain-on-failure", screenshot: "only-on-failure" },
  projects: [{ name: "chromium", use: { ...devices["Desktop Chrome"] } }],
  webServer: {
    command: [
      "WATCHPACK_POLLING=true",
      "node node_modules/next/dist/bin/next dev --webpack --hostname 127.0.0.1 --port 3100",
    ].join(" "),
    url: baseURL,
    reuseExistingServer: false,
    timeout: 240_000,
  },
});
