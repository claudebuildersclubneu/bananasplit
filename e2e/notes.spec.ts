import { expect, test } from "@playwright/test";

import { uniqueSuffix } from "./helpers";

// Notes (Moonstone 13): a page inside a page, the slash menu, Document
// mode, a comment on a passage, and a named version. Signs in as a seeded
// member (dave@example.edu, a MEMBER of Robotics Club; every seeded
// password is password123), so it needs the seeded dev database.

test("notes: nested pages, slash menu, Document mode, comments and history", async ({ page }) => {
  await page.goto("/sign-in");
  await page.getByLabel("Email").fill("dave@example.edu");
  await page.getByLabel("Password").fill("password123");
  await page.getByRole("button", { name: /^log in$/i }).click();
  await page.waitForURL(/\/app\//);

  await page.goto("/app/robotics-club/notes");
  await page.getByRole("button", { name: "New note", exact: true }).click();
  await expect(page).toHaveURL(/\/notes\/[a-z0-9]+$/);
  const parent = `E2E showcase ${uniqueSuffix()}`;
  await page.getByPlaceholder("Untitled note").fill(parent);
  const editor = page.locator(".tiptap").first();
  await editor.click();
  await page.keyboard.type("Doors at 6:30.");
  await page.keyboard.press("Enter");
  await page.keyboard.type("/callout");
  await page.getByRole("listbox", { name: "Insert a block" }).getByText("Callout").click();
  await page.keyboard.type("Bring your badge.");
  await expect(page.locator(".note-callout")).toContainText("Bring your badge.");
  await expect(page.getByText(/Saved|Saving/)).toBeVisible();

  // A page inside it, from the tree.
  const parentUrl = page.url();
  await page.getByRole("button", { name: `New page inside ${parent}` }).click();
  await page.waitForURL((u) => u.toString() !== parentUrl);
  await page.getByPlaceholder("Untitled note").fill("Run of show");
  await expect(page.getByRole("navigation", { name: "Breadcrumbs" })).toContainText(parent);
  await editor.click();
  await page.keyboard.type("Two rounds of six teams.");
  await expect(page.getByText("Saved")).toBeVisible();

  // Document mode, and a comment on the passage.
  await page.getByRole("button", { name: "Document", exact: true }).click();
  await expect(page.locator(".note-paper")).toBeVisible();
  await page.locator(".tiptap p").first().click({ clickCount: 3 });
  await page.getByRole("button", { name: "Comment", exact: true }).first().click();
  await page.getByLabel("New comment").fill("Three rounds of four?");
  await page.getByRole("button", { name: "Comment", exact: true }).last().click();
  await expect(page.getByRole("article", { name: /Comment by/ })).toContainText(
    "Three rounds of four?",
  );
  await expect(page.locator(".note-comment-hl")).toBeVisible();

  // A named version.
  await page.getByRole("button", { name: "Version history" }).click();
  await page.getByRole("button", { name: "Name this version" }).click();
  await page.getByLabel("Version name").fill("Final timeline");
  await page.getByRole("button", { name: "Save version" }).click();
  await expect(page.getByText("Final timeline")).toBeVisible();
});
