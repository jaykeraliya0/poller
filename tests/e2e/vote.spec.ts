import { createChoicePoll, expect, newVoterPage, readShareLink, register, test, uniqueEmail } from "./helpers";

const password = "correct horse battery";

test("a guest votes, changes their vote and withdraws it", async ({ page, browser }) => {
  await register(page, { name: "Olivia", email: uniqueEmail(), password });
  const pollPath = await createChoicePoll(page, { title: "Friday lunch" });

  const voter = await newVoterPage(browser);
  await voter.goto(pollPath);
  await expect(voter.getByRole("heading", { name: "Friday lunch" })).toBeVisible();

  await voter.getByRole("button", { name: "Submit vote" }).click();
  await expect(voter.getByText("Pick an option", { exact: true }).first()).toBeVisible();
  await expect(voter.getByText("Enter your name so the organiser knows who voted")).toBeVisible();

  await voter.getByRole("radio", { name: "Sushi" }).click();
  await voter.getByLabel("Your name").fill("Guest Gabe");
  await voter.getByLabel("Comment (optional)").fill("Anything but pizza");
  await voter.getByRole("button", { name: "Submit vote" }).click();
  await expect(voter.getByText("Your vote is in. Thanks!")).toBeVisible();
  await expect(voter.getByText(/^You voted/)).toBeVisible();

  // The form comes back prefilled for changing the vote.
  await expect(voter.getByRole("radio", { name: "Sushi" })).toBeChecked();
  await expect(voter.getByLabel("Your name")).toHaveValue("Guest Gabe");
  await voter.getByRole("radio", { name: "Pizza" }).click();
  await voter.getByRole("button", { name: "Update vote" }).click();
  await expect(voter.getByText("Your vote was updated")).toBeVisible();

  await voter.getByRole("button", { name: "Withdraw vote" }).click();
  await voter.getByRole("alertdialog").getByRole("button", { name: "Withdraw" }).click();
  await expect(voter.getByText("Your vote was withdrawn")).toBeVisible();
  await expect(voter.getByRole("button", { name: "Submit vote" })).toBeVisible();
  await expect(voter.getByRole("radio", { name: "Pizza" })).not.toBeChecked();

  // The owner's dashboard reflects zero responses again.
  await page.goto("/dashboard");
  await expect(page.getByRole("link", { name: /Friday lunch/ })).toContainText("0 responses");
});

test("a guest marks availability per time slot", async ({ page, browser }) => {
  await register(page, { name: "Tomas", email: uniqueEmail(), password });
  await page.goto("/polls/new?template=EVENT_DATE");
  await page.getByRole("button", { name: "Add slot" }).click();
  await page.getByRole("button", { name: "Add slot" }).click();
  await page.getByRole("button", { name: "Create poll" }).click();
  const pollPath = await readShareLink(page);

  const voter = await newVoterPage(browser);
  await voter.goto(pollPath);
  const slots = voter.getByRole("radiogroup");
  await expect(slots).toHaveCount(2);
  await expect(voter.getByText("0 of 2 slots answered")).toBeVisible();

  await slots.nth(0).getByRole("radio", { name: "Yes" }).click();
  await voter.getByLabel("Your name").fill("Vic");
  await voter.getByRole("button", { name: "Submit vote" }).click();
  await expect(voter.getByText("Answer every time slot")).toBeVisible();

  await slots.nth(1).getByRole("radio", { name: "If need be" }).click();
  await expect(voter.getByText("2 of 2 slots answered")).toBeVisible();
  await voter.getByRole("button", { name: "Submit vote" }).click();
  await expect(voter.getByText("Your vote is in. Thanks!")).toBeVisible();
  await expect(slots.nth(1).getByRole("radio", { name: "If need be" })).toBeChecked();
});

test("polls that require sign-in ask guests to sign in first", async ({ page, browser }) => {
  await register(page, { name: "Rhea", email: uniqueEmail(), password });
  const pollPath = await createChoicePoll(page, { title: "Members only", requireLogin: true });

  const voter = await newVoterPage(browser);
  await voter.goto(pollPath);
  await expect(voter.getByText("Sign in to vote").first()).toBeVisible();
  await expect(voter.getByRole("button", { name: "Submit vote" })).toHaveCount(0);

  await voter.getByRole("link", { name: "Sign in" }).last().click();
  await expect(voter).toHaveURL(new RegExp(`/login\\?next=${encodeURIComponent(pollPath).replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}`));
});

test("an unknown poll link shows a friendly 404", async ({ page }) => {
  // The page streams (loading.tsx), so this is a soft 404: status 200 plus noindex.
  await page.goto("/p/zzzzzzzzzz");
  await expect(page.locator('meta[name="robots"][content="noindex"]').first()).toBeAttached();
  await expect(page.getByRole("heading", { name: "Page not found" })).toBeVisible();
  await expect(page.getByRole("link", { name: "Go home" })).toBeVisible();
});
