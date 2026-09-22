import { expect, fillRegisterForm, register, test, uniqueEmail } from "./helpers";

const password = "correct horse battery";

test("redirects to login and back to the original page after signing up", async ({ page }) => {
  await page.goto("/dashboard");
  await expect(page).toHaveURL(/\/login\?next=%2Fdashboard/);

  await page.getByRole("link", { name: "Create an account" }).click();
  await expect(page).toHaveURL(/\/register\?next=%2Fdashboard/);

  await page.getByLabel("Name").fill("Ana Lima");
  await page.getByLabel("Email").fill(uniqueEmail());
  await page.getByLabel("Password").fill(password);
  await page.getByRole("button", { name: "Create account" }).click();

  await expect(page).toHaveURL(/\/dashboard$/);
  await expect(page.getByRole("heading", { name: "My polls" })).toBeVisible();
  await expect(page.getByText("No polls yet")).toBeVisible();
});

test("shows field errors and keeps input when the email is taken", async ({ page }) => {
  const email = uniqueEmail();
  await register(page, { name: "First", email, password });
  await page.context().clearCookies();

  await fillRegisterForm(page, { name: "Second", email, password });
  await expect(page.getByText("An account with this email already exists")).toBeVisible();
  await expect(page.getByLabel("Name")).toHaveValue("Second");
  await expect(page.getByLabel("Email")).toHaveValue(email);
  await expect(page.getByLabel("Password")).toHaveValue("");
});

test("signs out, rejects a wrong password, then signs in", async ({ page }) => {
  const email = uniqueEmail();
  await register(page, { name: "Ben Ortiz", email, password });

  await page.getByRole("button", { name: "Account menu" }).click();
  await page.getByRole("menuitem", { name: "Sign out" }).click();
  await expect(page.getByRole("link", { name: "Sign in" })).toBeVisible();

  await page.goto("/login");
  await page.getByLabel("Email").fill(email);
  await page.getByLabel("Password").fill("wrong password");
  await page.getByRole("button", { name: "Sign in" }).click();
  await expect(page.getByText("Incorrect email or password.")).toBeVisible();
  await expect(page.getByLabel("Email")).toHaveValue(email);

  await page.getByLabel("Password").fill(password);
  await page.getByRole("button", { name: "Sign in" }).click();
  await expect(page).toHaveURL(/\/dashboard$/);

  // Signed-in users are bounced away from the auth pages.
  await page.goto("/login");
  await expect(page).toHaveURL(/\/dashboard$/);
});
