import { expect, test } from "@playwright/test";
import { login, logout, uniqueEmail } from "./helpers";

test("daftar → login → logout → login lagi", async ({ page }) => {
  const email = uniqueEmail();
  const password = "e2e-password-123";

  await page.goto("/register");
  await page.fill("#name", "E2E Register");
  await page.fill("#email", email);
  await page.fill("#password", password);
  await page.getByRole("button", { name: "Daftar", exact: true }).click();

  await expect(page).toHaveURL(/\/$/, { timeout: 20_000 });
  await expect(page.getByText(/Sapaan Mentor/)).toBeVisible();
  await expect(page.getByText("Total XP")).toBeVisible();

  await logout(page);
  await expect(page.getByText("Masuk ke SOBAT ADI")).toBeVisible();

  await login(page, { email, name: "E2E Register", password });
  await expect(page.getByText("Total XP")).toBeVisible();
});
