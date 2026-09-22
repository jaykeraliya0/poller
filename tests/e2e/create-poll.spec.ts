import { confirmEmail, expect, register, test, uniqueEmail } from "./helpers";

const password = "correct horse battery";

test("creates a poll from a template, shares it and lists it on the dashboard", async ({ page }) => {
  await page.goto("/");
  await page.getByRole("link", { name: /Pick a workshop topic/ }).click();

  // Signed out: sign up first, then land back on the chosen template.
  await expect(page).toHaveURL(/\/login\?next=/);
  await page.getByRole("link", { name: "Create an account" }).click();
  const email = uniqueEmail();
  await page.getByLabel("Name").fill("Priya");
  await page.getByLabel("Email").fill(email);
  await page.getByLabel("Password").fill(password);
  await page.getByRole("button", { name: "Create account" }).click();
  await expect(page).toHaveURL(/\/polls\/new\?template=WORKSHOP_TOPIC/);

  // Creating polls waits for a confirmed email.
  await expect(page.getByText("Confirm your email to create polls")).toBeVisible();
  await confirmEmail(page, email);
  await page.goto("/polls/new?template=WORKSHOP_TOPIC");

  await expect(page.getByLabel("Title")).toHaveValue("Which workshop should we run?");
  await page.getByLabel("Title").fill("Q4 workshop topic");
  await page.getByRole("button", { name: "Add option" }).click();
  await page.keyboard.type("Design systems");
  await page.getByRole("button", { name: "Create poll" }).click();

  const dialog = page.getByRole("dialog", { name: "Your poll is live" });
  await expect(dialog).toBeVisible();
  await expect(dialog.getByRole("textbox", { name: "Poll link" })).toHaveValue(/\/p\/[2-9a-z]{10}$/);
  await page.keyboard.press("Escape");
  await expect(dialog).toBeHidden();
  await expect(page).not.toHaveURL(/created=1/);
  await expect(page.getByRole("heading", { name: "Q4 workshop topic" })).toBeVisible();

  await page.goto("/dashboard");
  const item = page.getByRole("link", { name: /Q4 workshop topic/ });
  await expect(item).toContainText("0 responses");
  await expect(item).toContainText("Open");
});

test("shows every validation problem at once and focuses the first", async ({ page }) => {
  await register(page, { name: "Val", email: uniqueEmail(), password });
  await page.goto("/polls/new?template=CUSTOM");

  await page.getByRole("button", { name: "Create poll" }).click();
  await expect(page.getByText("Title must be at least 3 characters")).toBeVisible();
  await expect(page.getByText("Option can't be empty")).toHaveCount(2);
  await expect(page.getByLabel("Title")).toBeFocused();

  // Errors update live once the user starts fixing them.
  await page.getByLabel("Title").fill("Team lunch");
  await expect(page.getByText("Title must be at least 3 characters")).toBeHidden();
  await page.getByLabel("Option 1", { exact: true }).fill("Tacos");
  await page.getByLabel("Option 2", { exact: true }).fill("tacos");
  await expect(page.getByText("Duplicate option")).toBeVisible();
  await page.getByLabel("Option 2", { exact: true }).fill("Ramen");

  await page.getByRole("button", { name: "Create poll" }).click();
  await expect(page.getByRole("dialog", { name: "Your poll is live" })).toBeVisible();
});

test("creates an availability poll with time slots", async ({ page }) => {
  await register(page, { name: "Sam", email: uniqueEmail(), password });
  await page.goto("/polls/new?template=EVENT_DATE");

  await page.getByRole("button", { name: "Create poll" }).click();
  await expect(page.getByText("Add at least 2 time slots")).toBeVisible();

  const addSlot = page.getByRole("button", { name: "Add slot" });
  await addSlot.click();
  await addSlot.click(); // start time advances, so this is the next slot
  await addSlot.click();
  await expect(page.getByText("6pm – 7pm")).toBeVisible();
  await expect(page.getByText("7pm – 8pm")).toBeVisible();
  await page.getByRole("button", { name: /Remove .* 8pm – 9pm/ }).click();
  await expect(page.getByText("8pm – 9pm")).toBeHidden();

  await page.getByRole("button", { name: "Create poll" }).click();
  await expect(page.getByRole("dialog", { name: "Your poll is live" })).toBeVisible();
});
