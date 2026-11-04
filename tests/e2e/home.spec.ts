import { expect, test } from "@playwright/test";
import { E2E_USERS, login } from "./helpers";

test("beranda menampilkan statistik pengguna yang login", async ({ page }) => {
  await login(page, E2E_USERS.home);

  await expect(page.getByText("E2E Home").first()).toBeVisible();
  await expect(page.getByText("Total XP", { exact: true })).toBeVisible();

  const xpCard = page.getByText("Total XP", { exact: true }).locator("..");
  await expect(xpCard.locator("p").first()).toHaveText("120");

  const streakCard = page.getByText("Streak", { exact: true }).locator("..");
  await expect(streakCard.locator("p").first()).toHaveText("7 hari");
});
