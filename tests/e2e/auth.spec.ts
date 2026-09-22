import { expect, fillRegisterForm, newVoterPage, register, test, uniqueEmail } from "./helpers";
import { linkPath, waitForEmail } from "./outbox";

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

test("confirms the email from the sign-up email, and won't reuse the link", async ({ page }) => {
  const email = uniqueEmail("confirm");
  await register(page, { name: "Cleo", email, password }, { confirm: false });
  await expect(page.getByText("Confirm your email.")).toBeVisible();

  // Can't create polls yet.
  await page.goto("/polls/new?template=CUSTOM");
  await expect(page.getByText("Confirm your email to create polls")).toBeVisible();
  await expect(page.getByLabel("Title")).toHaveCount(0);

  const link = linkPath(await waitForEmail(email, /^Confirm your email/));
  await page.goto(link);
  await expect(page).toHaveURL(/\/dashboard/);
  await expect(page.getByText("Email confirmed")).toBeVisible();
  await expect(page.getByText("Confirm your email.")).toHaveCount(0);

  await page.goto(link);
  await expect(page).toHaveURL(/\/verify-email\/invalid$/);
  await expect(page.getByText("You're all set")).toBeVisible();
});

test("resets a forgotten password and signs out the old session", async ({ page, browser }) => {
  const email = uniqueEmail("reset");
  await register(page, { name: "Rui", email, password });

  const other = await newVoterPage(browser);
  await other.goto("/login");
  await other.getByRole("link", { name: "Forgot password?" }).click();
  await expect(other.getByRole("heading", { name: "Forgot your password?" })).toBeVisible();
  await other.getByLabel("Email").fill(email);
  await other.getByRole("button", { name: "Email me a reset link" }).click();
  await expect(other.getByText("Check your inbox")).toBeVisible();

  await other.goto(linkPath(await waitForEmail(email, /^Reset your Poller password/)));
  await other.getByLabel("New password").fill("a brand new password");
  await other.getByRole("button", { name: "Set new password" }).click();
  await expect(other).toHaveURL(/\/login/);
  await expect(other.getByText("Password changed. Sign in with your new one.")).toBeVisible();

  await other.getByLabel("Email").fill(email);
  await other.getByLabel("Password").fill("a brand new password");
  await other.getByRole("button", { name: "Sign in" }).click();
  await expect(other).toHaveURL(/\/dashboard$/);

  // The session from before the reset no longer works.
  await page.goto("/dashboard");
  await expect(page).toHaveURL(/\/login/);
});

test("answers the same way for an address with no account", async ({ page }) => {
  await page.goto("/forgot-password");
  await page.getByLabel("Email").fill(uniqueEmail("nobody"));
  await page.getByRole("button", { name: "Email me a reset link" }).click();
  await expect(page.getByText("Check your inbox")).toBeVisible();
});
