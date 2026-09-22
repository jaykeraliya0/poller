import { createChoicePoll, expect, register, test, uniqueEmail } from "./helpers";

const password = "correct horse battery";

test("owner archives polls in bulk, finds them under Archived and brings one back", async ({ page }) => {
  test.slow();
  const stamp = Date.now();
  const titles = [`Team lunch ${stamp}`, `Book club ${stamp}`, `Offsite ${stamp}`];
  await register(page, { name: "Bulk Owner", email: uniqueEmail("bulk"), password });
  for (const title of titles) {
    await createChoicePoll(page, { title });
    await page.keyboard.press("Escape");
  }

  await page.goto("/dashboard");
  await page.getByRole("checkbox", { name: `Select ${titles[0]}` }).click();
  await page.getByRole("checkbox", { name: `Select ${titles[1]}` }).click();
  const toolbar = page.getByRole("toolbar", { name: "Actions for selected polls" });
  await expect(toolbar.getByText("2 polls selected")).toBeVisible();
  await toolbar.getByRole("button", { name: "Archive" }).click();
  await expect(page.getByText("Archived 2 polls.")).toBeVisible();

  // Only the third poll is left on the main list.
  await expect(page.getByRole("link", { name: new RegExp(titles[2]) })).toBeVisible();
  await expect(page.getByRole("link", { name: new RegExp(titles[0]) })).toHaveCount(0);

  await page.getByRole("link", { name: /^Archived/ }).click();
  await expect(page).toHaveURL(/status=archived/);
  await expect(page.getByRole("link", { name: new RegExp(titles[0]) })).toBeVisible();
  await expect(page.getByRole("link", { name: new RegExp(titles[1]) })).toBeVisible();

  // Archived polls are closed and say so; unarchiving brings one back to the main list.
  await page.getByRole("link", { name: new RegExp(titles[0]) }).click();
  await expect(page.getByText(/^Archived (just now|.* ago)$/)).toBeVisible();
  await page.getByRole("button", { name: "Unarchive" }).click();
  await expect(page.getByText("Poll unarchived")).toBeVisible();
  await expect(page.getByRole("button", { name: "Reopen" })).toBeVisible();

  // Select all on the page, then delete everything after confirming.
  await page.goto("/dashboard");
  await page.getByRole("checkbox", { name: "Select all polls on this page" }).click();
  await page.getByRole("toolbar", { name: "Actions for selected polls" }).getByRole("button", { name: "Delete" }).click();
  await page.getByRole("alertdialog").getByRole("button", { name: /^Delete 2 polls$/ }).click();
  await expect(page.getByText("Deleted 2 polls.")).toBeVisible();
});

test("owner downloads the results and analytics as PDF, PNG and JSON", async ({ page }) => {
  await register(page, { name: "Export Owner", email: uniqueEmail("export"), password });
  await createChoicePoll(page, { title: `Exports ${Date.now()}` });
  await page.keyboard.press("Escape");

  const cases = [
    ["Results report (PDF)", /-results\.pdf$/],
    ["Analytics report (PDF)", /-analytics\.pdf$/],
    ["Results image (PNG)", /-results\.png$/],
    ["All data (JSON)", /-export\.json$/],
  ] as const;
  for (const [item, filename] of cases) {
    await page.getByRole("button", { name: "More actions" }).click();
    const downloadPromise = page.waitForEvent("download");
    await page.getByRole("menuitem", { name: item }).click();
    const download = await downloadPromise;
    expect(download.suggestedFilename()).toMatch(filename);
    expect(await download.failure()).toBeNull();
  }
});
