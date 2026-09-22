import { expect, newVoterPage, readShareLink, register, test, uniqueEmail } from "./helpers";

test("organiser watches live results come in, then closes the poll", async ({ page, browser }) => {
  test.slow(); // three voters plus a live-refresh wait

  await register(page, { name: "Dana Organiser", email: uniqueEmail(), password: "correct horse battery" });
  await page.goto("/polls/new?template=EVENT_DATE");
  await page.getByLabel("Title").fill("Team dinner");
  await page.getByRole("button", { name: "Add slot" }).click();
  await page.getByRole("button", { name: "Add slot" }).click();
  await page.getByLabel("Expected participants (optional)").fill("4");
  await page.getByRole("button", { name: "Create poll" }).click();
  const pollPath = await readShareLink(page);
  await page.keyboard.press("Escape");
  await expect(page.getByRole("dialog")).toBeHidden();

  // Zero votes: an empty state with the share link, not empty charts.
  await expect(page.getByRole("heading", { name: "No votes yet" })).toBeVisible();
  await expect(page.getByRole("textbox", { name: "Poll link" })).toBeVisible();
  // A full reload would wipe this; router.refresh() keeps it.
  await page.evaluate(() => Object.assign(window, { __noReload: true }));

  // Three guests vote; everyone can make the first slot.
  const answers = [
    ["Yes", "No"],
    ["Yes", "If need be"],
    ["Yes", "No"],
  ];
  let lastVoter = page;
  for (const [index, [first, second]] of answers.entries()) {
    const voter = await newVoterPage(browser);
    await voter.goto(pollPath);
    const slots = voter.getByRole("radiogroup");
    await slots.nth(0).getByRole("radio", { name: first }).click();
    await slots.nth(1).getByRole("radio", { name: second }).click();
    await voter.getByLabel("Your name").fill(`Guest ${index + 1}`);
    await voter.getByRole("button", { name: "Submit vote" }).click();
    await expect(voter).toHaveURL(/\/results$/);
    lastVoter = voter;
  }
  await expect(lastVoter.getByText(/works for everyone \(3\/3\)/)).toBeVisible();

  // The organiser's page picks the votes up without a reload (15s auto-refresh).
  await expect(page.getByText(/works for everyone \(3\/3\)/)).toBeVisible({ timeout: 25_000 });
  expect(await page.evaluate(() => "__noReload" in window)).toBe(true);
  await expect(page.getByText("3 of 4 expected")).toBeVisible();
  await expect(page.getByText("Guest 2", { exact: true })).toBeVisible();

  await page.getByRole("button", { name: "Close poll" }).click();
  await page.getByRole("alertdialog").getByRole("button", { name: "Close poll" }).click();
  await expect(page.getByText("Poll closed. These are the final results.")).toBeVisible();
  await expect(page.getByText("Winner")).toBeVisible();
  await expect(page.getByRole("button", { name: "Reopen" })).toBeVisible();

  await lastVoter.goto(pollPath);
  await expect(lastVoter.getByText("This poll is closed")).toBeVisible();
  await expect(lastVoter.getByRole("button", { name: "Submit vote" })).toHaveCount(0);
});
