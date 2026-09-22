import AxeBuilder from "@axe-core/playwright";
import type { Page } from "@playwright/test";
import { createChoicePoll, expect, newVoterPage, register, test, uniqueEmail } from "./helpers";

/** WCAG 2.2 A/AA checks via axe; returns violations as readable strings. */
async function audit(page: Page) {
  // Let transitions and toasts finish so contrast is measured on settled colours.
  await page.evaluate(() =>
    Promise.all(
      document
        .getAnimations()
        // Skip infinite ones (the "Live" pulse, spinners): they never finish.
        .filter((animation) => animation.effect?.getComputedTiming().iterations !== Infinity)
        .map((animation) => animation.finished.catch(() => {})),
    ),
  );
  await page.waitForLoadState("networkidle");
  const results = await new AxeBuilder({ page }).withTags(["wcag2a", "wcag2aa", "wcag21aa", "wcag22aa"]).analyze();
  return results.violations.map(
    (violation) =>
      `${violation.id} (${violation.impact}): ${violation.nodes
        .map((node) => `${node.target.join(" ")} [${node.any.map((check) => check.message).join("; ")}] ${node.html.slice(0, 120)}`)
        .join(" | ")}`,
  );
}

test("core screens have no automatically detectable accessibility violations", async ({ page, browser }) => {
  test.slow();
  const screens: Record<string, string[]> = {};

  await page.goto("/");
  screens.landing = await audit(page);
  await page.goto("/login");
  screens.login = await audit(page);

  await register(page, { name: "Ally", email: uniqueEmail(), password: "correct horse battery" });
  screens.dashboardEmpty = await audit(page);

  await page.goto("/polls/new?template=WORKSHOP_TOPIC");
  await page.getByLabel("Title").waitFor();
  screens.createForm = await audit(page);

  const pollPath = await createChoicePoll(page, { title: "Accessible lunch", options: ["Soup", "Salad"] });
  screens.shareDialog = await audit(page);
  await page.keyboard.press("Escape");
  await expect(page.getByRole("dialog")).toBeHidden();

  const voter = await newVoterPage(browser);
  await voter.goto(pollPath);
  screens.vote = await audit(voter);
  await voter.getByRole("button", { name: "Submit vote" }).click();
  await expect(voter.getByText("Pick an option", { exact: true }).first()).toBeVisible();
  screens.voteWithErrors = await audit(voter);
  await voter.getByRole("radio", { name: "Soup" }).click();
  await voter.getByLabel("Your name").fill("Ally Voter");
  await voter.getByRole("button", { name: "Submit vote" }).click();
  await expect(voter).toHaveURL(/\/results$/);
  screens.results = await audit(voter);

  await page.goto("/dashboard");
  await page.getByRole("link", { name: /Accessible lunch/ }).click();
  await expect(page.getByRole("heading", { name: "Accessible lunch" })).toBeVisible();
  screens.manage = await audit(page);

  await page.goto("/settings");
  screens.settings = await audit(page);

  await page.goto("/shared");
  screens.sharedEmpty = await audit(page);
  await page.goto("/groups");
  screens.groupsEmpty = await audit(page);
  await page.goto("/groups/new");
  screens.newGroup = await audit(page);
  await page.getByLabel("Name").fill("Lunch crew");
  await page.getByLabel("People (optional)").fill("a@example.com, b@example.com");
  await page.getByRole("button", { name: "Create group" }).click();
  await expect(page.getByRole("heading", { name: "Lunch crew" })).toBeVisible();
  screens.group = await audit(page);

  const privatePath = await createChoicePoll(page, { title: "Private lunch", options: ["Soup", "Salad"], isPrivate: true });
  screens.privateShareDialog = await audit(page);
  await page.keyboard.press("Escape");
  const outsider = await newVoterPage(browser);
  await outsider.goto(privatePath);
  screens.privateNotice = await audit(outsider);

  expect(screens).toEqual(Object.fromEntries(Object.keys(screens).map((name) => [name, []])));
});

test("dark mode keeps the same accessibility guarantees", async ({ page, browser }) => {
  test.slow();
  await page.emulateMedia({ colorScheme: "dark" });
  const screens: Record<string, string[]> = {};

  await page.goto("/");
  screens.landing = await audit(page);
  await register(page, { name: "Dark Ally", email: uniqueEmail(), password: "correct horse battery" });
  const pollPath = await createChoicePoll(page, { title: "Night vote", options: ["Owls", "Bats"] });
  await page.keyboard.press("Escape");

  const voter = await newVoterPage(browser);
  await voter.emulateMedia({ colorScheme: "dark" });
  await voter.goto(pollPath);
  await voter.getByRole("button", { name: "Submit vote" }).click();
  await expect(voter.getByText("Pick an option", { exact: true }).first()).toBeVisible();
  screens.voteWithErrors = await audit(voter);
  await voter.getByRole("radio", { name: "Owls" }).click();
  await voter.getByLabel("Your name").fill("Nox");
  await voter.getByRole("button", { name: "Submit vote" }).click();
  await expect(voter).toHaveURL(/\/results$/);
  screens.results = await audit(voter);

  await page.goto("/settings");
  screens.settings = await audit(page);

  expect(screens).toEqual(Object.fromEntries(Object.keys(screens).map((name) => [name, []])));
});
