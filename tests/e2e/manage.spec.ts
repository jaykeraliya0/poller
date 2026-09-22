import { createChoicePoll, expect, newVoterPage, register, test, uniqueEmail } from "./helpers";

const password = "correct horse battery";

test("owner edits a poll after a vote; the voter sees the new option", async ({ page, browser }) => {
  await register(page, { name: "Ed Owner", email: uniqueEmail(), password });
  const pollPath = await createChoicePoll(page, { title: "Offsite city", options: ["Lisbon", "Porto"] });
  const manageUrl = page.url().replace(/\?.*$/, "");

  const voter = await newVoterPage(browser);
  await voter.goto(pollPath);
  await voter.getByRole("radio", { name: "Lisbon" }).click();
  await voter.getByLabel("Your name").fill("Val");
  await voter.getByRole("button", { name: "Submit vote" }).click();
  await expect(voter).toHaveURL(/\/results$/);

  await page.goto(manageUrl);
  await page.getByRole("link", { name: "Edit" }).click();
  await expect(page.getByText("1 person has voted.", { exact: false })).toBeVisible();
  // The voted option can't be removed; the other one can.
  await expect(page.getByRole("button", { name: "Option 1 has votes and can't be removed" })).toBeDisabled();
  await expect(page.getByRole("switch", { name: "Allow multiple choices" })).toBeDisabled();
  await page.getByRole("button", { name: "Add option" }).click();
  await page.keyboard.type("Madeira");
  await page.getByLabel("Title").fill("Offsite city (final round)");
  await page.getByRole("button", { name: "Save changes" }).click();
  await expect(page.getByText("Changes saved")).toBeVisible();
  await expect(page).toHaveURL(/\/manage$/);
  await expect(page.getByRole("heading", { name: "Offsite city (final round)" })).toBeVisible();

  await voter.goto(pollPath);
  await expect(voter.getByText("New options were added since then.", { exact: false })).toBeVisible();
  await expect(voter.getByRole("radio", { name: /Madeira.*New/ })).toBeVisible();
});

test("owner downloads the CSV and deletes the poll", async ({ page }) => {
  await register(page, { name: "Csv Owner", email: uniqueEmail(), password });
  await createChoicePoll(page, { title: "Export me" });
  await page.keyboard.press("Escape");

  await page.getByRole("button", { name: "More actions" }).click();
  const downloadPromise = page.waitForEvent("download");
  await page.getByRole("menuitem", { name: "Download responses (CSV)" }).click();
  const download = await downloadPromise;
  expect(download.suggestedFilename()).toMatch(/^poll-[2-9a-z]{10}-responses\.csv$/);

  await page.getByRole("button", { name: "More actions" }).click();
  await page.getByRole("menuitem", { name: "Delete poll" }).click();
  await page.getByRole("alertdialog").getByRole("button", { name: "Delete poll" }).click();
  await expect(page).toHaveURL(/\/dashboard$/);
  await expect(page.getByText("Poll deleted")).toBeVisible();
  await expect(page.getByText("No polls yet")).toBeVisible();
});

test("a user deletes their account after confirming their email", async ({ page }) => {
  const email = uniqueEmail();
  await register(page, { name: "Leaving Soon", email, password });
  await createChoicePoll(page, { title: "Goes with me" });

  await page.goto("/settings");
  await page.getByLabel(`Type ${email} to confirm`).fill("wrong@example.com");
  await page.getByRole("button", { name: "Delete my account" }).click();
  await expect(page.getByText("Type your email exactly to confirm")).toBeVisible();

  await page.getByLabel(`Type ${email} to confirm`).fill(email);
  await page.getByRole("button", { name: "Delete my account" }).click();
  await expect(page.getByText("Your account and polls were deleted")).toBeVisible();
  await expect(page.getByRole("link", { name: "Sign in" })).toBeVisible();

  await page.goto("/login");
  await page.getByLabel("Email").fill(email);
  await page.getByLabel("Password").fill(password);
  await page.getByRole("button", { name: "Sign in" }).click();
  await expect(page.getByText("Incorrect email or password.")).toBeVisible();
});
