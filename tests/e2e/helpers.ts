import { test as base, expect, type Page } from "@playwright/test";

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
