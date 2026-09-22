import { devices } from "@playwright/test";
import { createChoicePoll, expect, newVoterPage, readShareLink, register, test, uniqueEmail } from "./helpers";

const password = "correct horse battery";

test("poll closes while a voter has the form open: vote rejected, input kept, banner shown", async ({ page, browser }) => {
  await register(page, { name: "Closer", email: uniqueEmail(), password });
  const pollPath = await createChoicePoll(page, { title: "Closing soon" });
  await page.keyboard.press("Escape");

  const voter = await newVoterPage(browser);
  await voter.goto(pollPath);
  await voter.getByRole("radio", { name: "Sushi" }).click();
  await voter.getByLabel("Your name").fill("Late Larry");
  await voter.getByLabel("Comment (optional)").fill("Hope I'm in time");

  // Meanwhile the owner closes the poll (same path as the deadline passing).
  await page.getByRole("button", { name: "Close poll" }).click();
  await page.getByRole("alertdialog").getByRole("button", { name: "Close poll" }).click();
  await expect(page.getByRole("button", { name: "Reopen" })).toBeVisible();

  await voter.getByRole("button", { name: "Submit vote" }).click();
  await expect(voter.getByRole("alert").filter({ hasText: "This poll has closed. Your answers weren't submitted." })).toBeVisible();
  await expect(voter.getByRole("radio", { name: "Sushi" })).toBeChecked();
  await expect(voter.getByLabel("Your name")).toHaveValue("Late Larry");
  await expect(voter.getByLabel("Comment (optional)")).toHaveValue("Hope I'm in time");
  await expect(voter.getByRole("button", { name: "Submit vote" })).toBeDisabled();
});

test("a voter in another time zone sees their local time next to each slot", async ({ page, browser }) => {
  await register(page, { name: "Tz Owner", email: uniqueEmail(), password });
  await page.goto("/polls/new?template=EVENT_DATE");
  await page.getByLabel("Time zone").selectOption("Europe/London");
  await page.getByRole("button", { name: "Add slot" }).click();
  await page.getByRole("button", { name: "Add slot" }).click();
  await page.getByRole("button", { name: "Create poll" }).click();
  const pollPath = await readShareLink(page);

  const context = await browser.newContext({
    ...devices["Pixel 7"],
    timezoneId: "America/New_York",
    baseURL: test.info().project.use.baseURL,
  });
  const voter = await context.newPage();
  await voter.goto(pollPath);
  await expect(voter.getByText("Times are in Europe/London.")).toBeVisible();
  // 6pm London is 1pm in New York (both on daylight or both on standard time).
  await expect(voter.getByText("1pm – 2pm your time")).toBeVisible();

  const londoner = await newVoterPage(browser);
  await londoner.goto(pollPath);
  await expect(londoner.getByText(/your time/)).toHaveCount(0);
});
