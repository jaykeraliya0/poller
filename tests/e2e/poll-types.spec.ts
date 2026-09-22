import type { Page } from "@playwright/test";
import { expect, newVoterPage, readShareLink, register, test, uniqueEmail } from "./helpers";

const password = "correct horse battery";

async function createFromTemplate(page: Page, template: string, configure?: () => Promise<void>) {
  await page.goto(`/polls/new?template=${template}`);
  await page.getByLabel("Title").waitFor();
  await configure?.();
  await page.getByRole("button", { name: "Create poll" }).click();
  return readShareLink(page);
}

test("ranking poll: voters tap to rank and the result is a tie", async ({ page, browser }) => {
  test.slow();
  await register(page, { name: "Priya PM", email: uniqueEmail(), password });
  const pollPath = await createFromTemplate(page, "FEATURE_PRIORITY");

  const ballots = [
    ["Dark mode", "Offline support", "Search"],
    ["Offline support", "Dark mode", "CSV export"],
    ["Dark mode", "Offline support", "CSV export"],
    ["Offline support", "Dark mode", "Faster search"],
  ];
  let voter = page;
  for (const [index, ballot] of ballots.entries()) {
    voter = await newVoterPage(browser);
    await voter.goto(pollPath);
    await expect(voter.getByText("Tap your top 3 in order of preference, favourite first.")).toBeVisible();
    for (const label of ballot) {
      await voter.getByRole("button", { name: new RegExp(`^${label === "Search" ? "Faster search" : label}`) }).click();
    }
    await expect(voter.getByText("3 of 3 ranked")).toBeVisible();
    await voter.getByLabel("Your name").fill(`Dev ${index + 1}`);
    await voter.getByRole("button", { name: "Submit vote" }).click();
    await expect(voter).toHaveURL(/\/results$/);
  }

  await expect(voter.getByText("Tied at the top: Dark mode and Offline support with 10 points each")).toBeVisible();
  await expect(voter.getByText("Tie", { exact: true })).toBeVisible();
  await expect(voter.getByText("Opinions split", { exact: true })).toBeVisible();
});

test("anonymous rating poll: comments show without names or times", async ({ page, browser }) => {
  test.slow();
  await register(page, { name: "Omar Organiser", email: uniqueEmail(), password });
  const pollPath = await createFromTemplate(page, "OFFSITE_LOCATION", async () => {
    await page.getByRole("switch", { name: "Anonymous voting" }).click();
  });
  await page.keyboard.press("Escape");
  const manageUrl = page.url().replace(/\?.*$/, "");

  const ratings = [
    { Lisbon: 5, Barcelona: 1, Amsterdam: 3, comment: "Lisbon, obviously" },
    { Lisbon: 4, Barcelona: 5, Amsterdam: 3, comment: "Barcelona for the beach" },
    { Lisbon: 4, Barcelona: 1, Amsterdam: 2 },
    { Lisbon: 5, Barcelona: 5, Amsterdam: 3 },
  ];
  let voter = page;
  for (const { comment, ...scores } of ratings) {
    voter = await newVoterPage(browser);
    await voter.goto(pollPath);
    await expect(voter.getByText("This poll is anonymous", { exact: false })).toBeVisible();
    await expect(voter.getByLabel("Your name")).toHaveCount(0);
    for (const [city, score] of Object.entries(scores)) {
      await voter.getByRole("radiogroup", { name: city }).getByRole("radio", { name: new RegExp(`^${score}\\b`) }).click();
    }
    if (comment) await voter.getByLabel("Comment (optional)").fill(comment);
    await voter.getByRole("button", { name: "Submit vote" }).click();
    await expect(voter).toHaveURL(/\/results$/);
  }

  await expect(voter.getByText("Lisbon is rated highest: 4.5 / 5 on average from 4 ratings")).toBeVisible();
  await expect(voter.getByText(/Opinions split on Barcelona/)).toBeVisible();
  await expect(voter.getByText("Lisbon, obviously")).toBeVisible();
  await expect(voter.getByText(/^Anonymous · \d{1,2} [A-Z][a-z]+ \d{4}$/).first()).toBeVisible();

  // The owner doesn't see names either: no "Who voted" list on an anonymous poll.
  await page.goto(manageUrl);
  await expect(page.getByText("Barcelona for the beach")).toBeVisible();
  await expect(page.getByRole("heading", { name: "Who voted" })).toHaveCount(0);
});
