import { test as base, devices, expect, type Browser, type BrowserContext, type Page } from "@playwright/test";

/** Extra browsers opened by the current test (other voters); closed when it ends. */
const voterContexts: BrowserContext[] = [];

/**
 * Skips Next's background link prefetches. They only speed up navigation, and
 * a test moving on mid-prefetch makes the server log "destination stream
 * closed early". Real navigations still fetch every page as usual.
 */
async function skipPrefetches(context: BrowserContext) {
  await context.route("**/*", (route) =>
    route.request().headers()["next-router-prefetch"] ? route.abort() : route.fallback(),
  );
}

/** Waits for a page's in-flight requests, so closing it never aborts a response mid-stream. */
async function settle(page: Page) {
  await page.waitForLoadState("networkidle", { timeout: 5_000 }).catch(() => {});
}

/**
 * Each test gets its own client IP so rate limits (which trust
 * x-forwarded-for) never leak between tests or reruns.
 */
export const test = base.extend<{ closeVoters: void }>({
  extraHTTPHeaders: async ({}, provide) => {
    const octet = () => Math.floor(Math.random() * 254) + 1;
    await provide({ "x-forwarded-for": `10.${octet()}.${octet()}.${octet()}` });
  },
  context: async ({ context }, provide) => {
    await skipPrefetches(context);
    await provide(context);
  },
  // Lets every page finish loading before teardown, so no response is cut off.
  closeVoters: [
    async ({ page }, use) => {
      await use();
      const contexts = voterContexts.splice(0);
      await Promise.all([page, ...contexts.flatMap((context) => context.pages())].map(settle));
      await Promise.all(contexts.map((context) => context.close()));
    },
    { auto: true },
  ],
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
export async function newVoterPage(browser: Browser, { timezoneId = "Europe/London" } = {}): Promise<Page> {
  const context = await browser.newContext({
    ...devices["Pixel 7"],
    // Pinned by default so slot times read the same as in the organiser's context.
    timezoneId,
    baseURL: test.info().project.use.baseURL,
    extraHTTPHeaders: { "x-forwarded-for": randomIp() },
  });
  await skipPrefetches(context);
  voterContexts.push(context);
  return context.newPage();
}

type NewPollOptions = {
  title: string;
  options?: string[];
  requireLogin?: boolean;
  /** Only invited people can vote. */
  isPrivate?: boolean;
  resultsAfterVote?: boolean;
};

/** Creates a single-choice poll from the custom template; returns its vote URL path. */
export async function createChoicePoll(
  page: Page,
  { title, options = ["Pizza", "Sushi"], requireLogin, isPrivate, resultsAfterVote }: NewPollOptions,
) {
  await page.goto("/polls/new?template=CUSTOM");
  await page.getByLabel("Title").fill(title);
  for (const [index, label] of options.entries()) {
    if (index >= 2) await page.getByRole("button", { name: "Add option" }).click();
    await page.getByLabel(`Option ${index + 1}`, { exact: true }).fill(label);
  }
  if (requireLogin) await page.getByRole("switch", { name: "Require sign-in to vote" }).click();
  if (isPrivate) await page.getByRole("radio", { name: /Only people I invite/ }).click();
  if (resultsAfterVote) await page.getByRole("radio", { name: /After voting/ }).click();
  await page.getByRole("button", { name: "Create poll" }).click();
  return readShareLink(page);
}

export async function readShareLink(page: Page) {
  const link = await page.getByRole("dialog").getByRole("textbox", { name: "Poll link" }).inputValue();
  return new URL(link).pathname;
}
