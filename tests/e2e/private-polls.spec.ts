import { createChoicePoll, expect, newVoterPage, register, test, uniqueEmail } from "./helpers";

const password = "correct horse battery";

test("a private poll reaches invitees and groups, and nobody else", async ({ page, browser }) => {
  test.slow();
  const inviteeEmail = uniqueEmail("invitee");
  const memberEmail = uniqueEmail("member");
  const title = `Secret budget ${Date.now()}`;

  // Organiser: a group with one person, then a private poll shared with it plus one direct invite.
  await register(page, { name: "Olga Organiser", email: uniqueEmail("owner"), password });
  await page.goto("/groups/new");
  await page.getByLabel("Name").fill("Leads");
  await page.getByLabel("People (optional)").fill(memberEmail);
  await page.getByRole("button", { name: "Create group" }).click();
  await expect(page.getByRole("heading", { name: "Leads" })).toBeVisible();
  await expect(page.getByText(memberEmail)).toBeVisible();

  const pollPath = await createChoicePoll(page, { title, options: ["Yes", "No"], isPrivate: true, resultsAfterVote: true });
  const dialog = page.getByRole("dialog", { name: "Your poll is live" });
  await expect(dialog.getByText("Only people you invite can open it.")).toBeVisible();
  await dialog.getByLabel("Invite by email").fill(inviteeEmail);
  await dialog.getByRole("button", { name: "Add" }).click();
  await expect(dialog.getByText(inviteeEmail)).toBeVisible();
  await expect(dialog.getByText("Not signed up")).toBeVisible();
  await dialog.getByRole("checkbox", { name: /Leads/ }).click();
  await expect(dialog.getByRole("checkbox", { name: /Leads/ })).toBeChecked();
  await page.keyboard.press("Escape");

  // A guest is asked to sign in, and learns nothing about the poll.
  const guest = await newVoterPage(browser);
  await guest.goto(pollPath);
  await expect(guest.getByText("This poll is private")).toBeVisible();
  await expect(guest.getByText(title)).toHaveCount(0);
  await expect(guest).toHaveTitle(/Private poll/);

  // Someone signed in but not invited is turned away.
  const stranger = await newVoterPage(browser);
  await register(stranger, { name: "Stan", email: uniqueEmail("stranger"), password });
  await stranger.goto(`${pollPath}/results`);
  await expect(stranger.getByText("You're not on the invite list")).toBeVisible();
  await expect(stranger.getByText(title)).toHaveCount(0);

  // The direct invitee signs up later, finds the poll under "Shared with me" and votes.
  const invitee = await newVoterPage(browser);
  await register(invitee, { name: "Ivy", email: inviteeEmail, password });
  await invitee.goto("/shared");
  const row = invitee.getByRole("link", { name: new RegExp(title) });
  await expect(row).toContainText("Not voted yet");
  await expect(row).toContainText("by Olga Organiser");
  await row.click();
  await expect(invitee.getByRole("heading", { name: title })).toBeVisible();
  await invitee.getByRole("radio", { name: "Yes" }).click();
  await invitee.getByRole("button", { name: "Submit vote" }).click();
  await expect(invitee).toHaveURL(/\/results$/);

  // The group member gets in too, through the group.
  const member = await newVoterPage(browser);
  await register(member, { name: "Max", email: memberEmail, password });
  await member.goto(pollPath);
  await expect(member.getByRole("heading", { name: title })).toBeVisible();
  await member.goto("/shared");
  await expect(member.getByRole("link", { name: new RegExp(title) })).toBeVisible();
});
