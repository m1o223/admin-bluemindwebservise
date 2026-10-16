import { defineConfig } from "@playwright/test";

export default defineConfig({
  testDir: "./tests",
  fullyParallel: true,
  workers: 2,
  use: { baseURL: process.env.PLAYWRIGHT_BASE_URL || "http://localhost:3107", browserName: "chromium", screenshot: "only-on-failure" },
  webServer: process.env.PLAYWRIGHT_BASE_URL ? undefined : {
    command: "npm run start -- --port 3107", url: "http://localhost:3107", reuseExistingServer: !process.env.CI, timeout: 60000,
  },
});
