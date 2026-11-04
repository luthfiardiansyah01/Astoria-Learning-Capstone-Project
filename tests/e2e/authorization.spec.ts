import { expect, test } from "@playwright/test";

test("halaman utama tanpa login diarahkan ke /login", async ({ page }) => {
  await page.goto("/");
  await expect(page).toHaveURL(/\/login/);
  await expect(page.getByText("Masuk ke SOBAT ADI")).toBeVisible();
});

test("API terlindungi menolak request tanpa sesi", async ({ page }) => {
  const admin = await page.request.get("/api/admin/users");
  expect(admin.status()).toBe(401);

  const documents = await page.request.get("/api/documents");
  expect(documents.status()).toBe(401);
});
