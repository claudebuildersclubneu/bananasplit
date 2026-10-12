import { expect, test } from "@playwright/test";

import { makeUser, readPasswordResetToken, signUp } from "./helpers";

/**
 * Password reset through the real UI (docs/features/accounts.md): ask for a
 * link from the log-in page, set a new password from the mailed link, and
 * check that the link works once, the old session ends and only the new
 * password logs in.
 */
test("a forgotten password is reset from the emailed link", async ({ page, browser }) => {
  const user = makeUser("Reset");
  await signUp(page, user);
  await page.waitForURL(/\/onboarding/);

  // A second browser, signed out, asks for the link.
  const other = await browser.newContext();
  const reset = await other.newPage();
  await reset.goto("/sign-in");
  await reset.getByRole("link", { name: "Forgot?" }).click();
  await reset.waitForURL(/\/forgot-password$/);
  await reset.getByLabel("Email").fill(user.email);
  await reset.getByRole("button", { name: "Send reset link" }).click();
  await expect(reset.getByRole("heading", { name: "Check your email." })).toBeVisible();

  const token = await readPasswordResetToken(user.email);
  await reset.goto(`/reset-password/${token}`);
  await expect(reset.getByRole("heading", { name: "Choose a new password." })).toBeVisible();
  const newPassword = "a whole new banana phrase";
  await reset.getByLabel("New password").fill(newPassword);
  await reset.getByRole("button", { name: "Set new password" }).click();
  await reset.waitForURL(/\/sign-in\?notice=password-reset$/);
  await expect(reset.getByText("Your password is changed.")).toBeVisible();

  // The link is spent.
  await reset.goto(`/reset-password/${token}`);
  await expect(reset.getByRole("heading", { name: "This link doesn't work." })).toBeVisible();

  // The session from before the reset is over.
  await page.goto("/onboarding");
  await page.waitForURL(/\/sign-in/);

  // The old password no longer works; the new one does.
  await reset.goto("/sign-in");
  await reset.getByLabel("Email").fill(user.email);
  await reset.getByLabel("Password").fill(user.password);
  await reset.getByRole("button", { name: "Log in" }).click();
  await expect(reset.getByText("Incorrect email or password.")).toBeVisible();
  await reset.getByLabel("Password").fill(newPassword);
  await reset.getByRole("button", { name: "Log in" }).click();
  await reset.waitForURL(/\/onboarding/);

  await other.close();
});
