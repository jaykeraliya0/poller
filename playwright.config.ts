import "dotenv/config";
import { defineConfig, devices } from "@playwright/test";
import { EMAIL_OUTBOX_DIR } from "./tests/e2e/outbox";

const PORT = Number(process.env.E2E_PORT ?? 3100);
const baseURL = `http://localhost:${PORT}`;

export default defineConfig({
  testDir: "tests/e2e",
  fullyParallel: false,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 2 : 0,
  reporter: process.env.CI ? "github" : "list",
  use: {
    baseURL,
    // One fixed zone for every browser, so date/time assertions are deterministic.
    timezoneId: "Europe/London",
    trace: "retain-on-failure",
  },
  projects: [
    { name: "mobile-chrome", use: { ...devices["Pixel 7"] } },
    { name: "mobile-safari", use: { ...devices["iPhone 14"] } },
    { name: "desktop-chrome", use: { ...devices["Desktop Chrome"] } },
  ],
  webServer: {
    command: `pnpm build && pnpm start --port ${PORT}`,
    url: baseURL,
    // Never reuse: a stray dev server would point at the wrong database.
    reuseExistingServer: false,
    timeout: 180_000,
    // E2E runs against the disposable test database, never the dev one.
    // Emails land in EMAIL_OUTBOX_DIR as files, so tests can follow their links; never through Resend.
    env: { DATABASE_URL: process.env.DATABASE_URL_TEST ?? "", APP_URL: baseURL, EMAIL_OUTBOX_DIR, RESEND_API_KEY: "" },
  },
});
