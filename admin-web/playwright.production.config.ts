import { defineConfig } from "@playwright/test";
export default defineConfig({
  testDir: "./tests/browser",
  testMatch: "production.spec.ts",
  workers: 1,
  use: {
    baseURL: "http://127.0.0.1:3101",
    browserName: "chromium",
    channel: process.env.CI ? undefined : "chrome",
  },
  webServer: {
    command: "npm run start",
    url: "http://127.0.0.1:3101/sign-in",
    timeout: 60000,
    reuseExistingServer: false,
    env: { ADMIN_MOCK_MODE: "", NODE_ENV: "production" },
  },
});
