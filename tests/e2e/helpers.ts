import { test as base, devices, expect, type Browser, type Page } from "@playwright/test";

/**
 * Each test gets its own client IP so rate limits (which trust
 * x-forwarded-for) never leak between tests or reruns.
 */
export const test = base.extend({
  extraHTTPHeaders: async ({}, provide) => {
    const octet = () => Math.floor(Math.random() * 254) + 1;
    await provide({ "x-forwarded-for": `10.${octet()}.${octet()}.${octet()}` });
  },
});

export { expect };

export function uniqueEmail(prefix = "e2e") {
  return `${prefix}-${Date.now()}-${Math.floor(Math.random() * 1e6)}@example.com`;
}

type Account = { name: string; email: string; password: string };

export async function fillRegisterForm(page: Page, { name, email, password }: Account) {
  await page.goto("/register");
  await page.getByLabel("Name").fill(name);
  await page.getByLabel("Email").fill(email);
  await page.getByLabel("Password").fill(password);
  await page.getByRole("button", { name: "Create account" }).click();
}

/** Signs up and waits until the session exists (landing on the dashboard). */
export async function register(page: Page, account: Account) {
  await fillRegisterForm(page, account);
  await page.waitForURL(/\/dashboard$/);
}

const randomIp = () => `10.${[0, 0, 0].map(() => Math.floor(Math.random() * 254) + 1).join(".")}`;

/** A separate phone browser with its own cookies and IP, i.e. another voter. */
export async function newVoterPage(browser: Browser): Promise<Page> {
  const context = await browser.newContext({
    ...devices["Pixel 7"],
    // Pinned so slot times read the same as in the organiser's context.
    timezoneId: "Europe/London",
    baseURL: test.info().project.use.baseURL,
    extraHTTPHeaders: { "x-forwarded-for": randomIp() },
  });
  return context.newPage();
}

type NewPollOptions = { title: string; options?: string[]; requireLogin?: boolean };

/** Creates a single-choice poll from the custom template; returns its vote URL path. */
export async function createChoicePoll(page: Page, { title, options = ["Pizza", "Sushi"], requireLogin }: NewPollOptions) {
  await page.goto("/polls/new?template=CUSTOM");
  await page.getByLabel("Title").fill(title);
  for (const [index, label] of options.entries()) {
    if (index >= 2) await page.getByRole("button", { name: "Add option" }).click();
    await page.getByLabel(`Option ${index + 1}`, { exact: true }).fill(label);
  }
  if (requireLogin) await page.getByRole("switch", { name: "Require sign-in to vote" }).click();
  await page.getByRole("button", { name: "Create poll" }).click();
  return readShareLink(page);
}

export async function readShareLink(page: Page) {
  const link = await page.getByRole("dialog").getByRole("textbox", { name: "Poll link" }).inputValue();
  return new URL(link).pathname;
}
