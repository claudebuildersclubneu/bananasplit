import { randomInt } from "node:crypto";

import { expect, test } from "@playwright/test";

import { makeUser, readVerificationToken, uniqueSuffix } from "./helpers";

// Free RSVP pages (docs/features/rsvp.md, "Free pages"): someone with no
// club makes an event page from /rsvp, sets a price and a bring list; a
// guest signs up, takes a line and says they paid; a friend comes through
// the guest's invite link; the host confirms the payment and checks people
// in at the door. Real UI, dev server, Postgres.
test("free RSVP page: no club, split the cost, bring list, invite link, door check-in", async ({
  page,
  browser,
}) => {
  const host = makeUser("Free host");
  const suffix = uniqueSuffix();
  const title = `E2E Study break ${suffix}`;

  // Signed out, "Create an event" goes through a sign-up worded for it, and back.
  await page.context().setExtraHTTPHeaders({
    "x-real-ip": `198.18.${randomInt(0, 256)}.${randomInt(1, 255)}`,
  });
  await page.goto("/rsvp");
  await page.getByRole("link", { name: /Create an event, free/ }).click();
  await page.waitForURL(/\/sign-in\?callbackUrl=%2Frsvp%2Fnew/);
  await page.getByRole("link", { name: /Create an account|Sign up/i }).click();
  await expect(page.getByRole("heading", { name: /Create your account/ })).toBeVisible();
  await page.getByLabel("Full name").fill(host.name);
  await page.getByLabel("Email", { exact: true }).fill(host.email);
  await page.getByLabel("Password", { exact: true }).fill(host.password);
  await page.getByRole("button", { name: "Create account" }).click();
  await page.waitForURL(/\/rsvp\/new/);
  // Where a deployment verifies addresses, the page asks for it first.
  if (await page.getByText("Check your email").isVisible()) {
    const token = await readVerificationToken(host.email);
    await page.goto(`/verify-email/${token}`);
    await page.getByRole("button", { name: "Confirm email" }).click();
    await page.getByRole("heading", { name: /Email confirmed/ }).waitFor();
    await page.goto("/rsvp/new");
  }

  await page.getByLabel("Event name").fill(title);
  await page.getByLabel("Where").fill("Snell Library 090, 360 Huntington Ave");
  await page.getByRole("button", { name: "Create the page" }).click();
  await page.waitForURL(/\/rsvp\/[^/]+\?new=1/);
  const eventPath = new URL(page.url()).pathname;
  await expect(page.getByText(/Free pages keep their guest list/)).toBeVisible();

  await page.getByRole("radio", { name: /Price each/ }).click();
  await page.getByLabel("Price per guest").fill("5");
  await page.getByLabel("Venmo").fill("@e2e-host-22");
  await page.getByRole("button", { name: "Save changes" }).click();
  await expect(page.getByText("RSVP page saved")).toBeVisible();
  await page.getByRole("button", { name: "+ Snacks" }).click();
  await page.getByRole("button", { name: "Save bring list" }).click();
  await expect(page.getByText("Bring list saved")).toBeVisible();

  const link = await page.getByRole("link", { name: /\/e\/[a-z0-9]{8}$/ }).getAttribute("href");
  const pagePath = new URL(link!).pathname;

  // A guest: sign up, take the line, say they paid.
  const guestContext = await browser.newContext();
  const guest = await guestContext.newPage();
  await guest.goto(pagePath);
  await expect(guest.getByText(/\$5 each/).first()).toBeVisible();
  await guest.getByLabel("Name").fill("Ava Guest");
  await guest.getByLabel("Email").fill(`ava-${suffix}@example.com`);
  await guest.getByLabel("Phone").fill("617-555-0110");
  await guest.getByRole("button", { name: "Register" }).click();
  await expect(guest.getByRole("heading", { name: /You're going/ })).toBeVisible();
  await guest.getByRole("button", { name: "I'll bring it" }).click();
  await expect(guest.getByText("You're bringing this")).toBeVisible();
  await guest.getByRole("button", { name: "I've paid $5" }).click();
  await expect(guest.getByText("Waiting for the host")).toBeVisible();
  await expect(guest.locator("a[href^='https://venmo.com/e2e-host-22']")).toHaveAttribute(
    "href",
    /amount=5\.00/,
  );
  const inviteText = await guest
    .getByText(/\?via=/)
    .first()
    .textContent();
  const via = /via=([a-z0-9]+)/.exec(inviteText ?? "")?.[1];
  expect(via).toBeTruthy();

  // A friend through the guest's link.
  const friendContext = await browser.newContext();
  const friend = await friendContext.newPage();
  await friend.goto(`${pagePath}?via=${via}`);
  await expect(friend.getByText("Ava Guest invited you")).toBeVisible();
  await friend.getByLabel("Name").fill("Ben Friend");
  await friend.getByLabel("Email").fill(`ben-${suffix}@example.com`);
  await friend.getByLabel("Phone").fill("617-555-0111");
  await friend.getByRole("button", { name: "Register" }).click();
  await expect(friend.getByRole("heading", { name: /You're going/ })).toBeVisible();

  // The host: who brought who, the payment, the door.
  await page.goto(eventPath);
  await expect(page.getByText("Invited by Ava Guest")).toBeVisible();
  await page.getByRole("button", { name: "Confirm $5" }).click();
  await expect(page.getByText("Paid $5").first()).toBeVisible();
  await page.goto(`${eventPath}/door`);
  await page.getByLabel("Find a guest by name").fill("Ben");
  await page.getByRole("button", { name: "Check in Ben Friend" }).click();
  await expect(page.getByText("Ben Friend is in")).toBeVisible();

  // The free event never shows up as a club.
  await page.goto("/app");
  await page.waitForURL(/\/onboarding/);

  await guestContext.close();
  await friendContext.close();
});
