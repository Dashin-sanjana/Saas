import { expect, test } from "@playwright/test";

test.describe("smart scheduling journey", () => {
  test.skip(!process.env.E2E_BASE_URL, "Set E2E_BASE_URL and run the API against a dedicated test database");

  test("registers, onboards, schedules, moves, locks, regenerates and restores", async ({ page }) => {
    const email = `e2e-${Date.now()}@example.com`;
    await page.goto("/register");
    await page.getByLabel("Name").fill("E2E User");
    await page.getByLabel("Email").fill(email);
    await page.getByLabel("Password").fill("Password123!");
    await page.getByRole("button", { name: /create account/i }).click();
    await expect(page.getByRole("heading", { name: "Onboarding" })).toBeVisible();
    await page.getByRole("button", { name: "Next" }).click();
    await page.getByLabel("Title").fill("Wednesday Lecture");
    await page.getByLabel("Day").selectOption("WEDNESDAY");
    await page.getByRole("button", { name: "Next" }).click();
    await page.getByLabel("Name").fill("Formal Methods");
    await page.getByRole("button", { name: "Next" }).click();
    await page.getByLabel("Title").fill("Research");
    await page.getByLabel("Duration minutes").fill("120");
    await page.getByRole("button", { name: "Next" }).click();
    await page.getByRole("button", { name: "Next" }).click();
    await page.getByRole("button", { name: "Complete" }).click();
    await page.goto("/app/week");
    await page.getByRole("button", { name: /generate schedule/i }).click();
    await expect(page.getByRole("dialog", { name: "Schedule preview" })).toBeVisible();
    await page.getByRole("button", { name: "Accept schedule" }).click();
    await expect(page.getByText("Schedule updated successfully.")).toBeVisible();
    const block = page.locator('[data-testid^="schedule-block-"]').first();
    await block.dragTo(page.locator('[data-testid^="slot-"]').nth(20));
    await block.click();
    await page.getByRole("button", { name: "Lock" }).click();
    await page.getByRole("button", { name: /generate schedule/i }).click();
    await page.getByRole("button", { name: "Accept schedule" }).click();
    const restore = page.getByRole("button", { name: "Restore" }).first();
    await expect(restore).toBeVisible();
    await restore.click();
  });
});
