import { expect, test } from "@playwright/test";
import { E2E_USERS, expectNoHorizontalOverflow, login } from "./helpers";

test("navigasi bawah mobile membuka panduan interaktif", async ({ page }) => {
  await page.setViewportSize({ width: 375, height: 812 });
  await login(page, E2E_USERS.student);

  await expect(page.getByTestId("nav-more")).toBeVisible();
  await expectNoHorizontalOverflow(page);

  await page.getByTestId("nav-more").click();
  await expect(page.getByRole("heading", { name: "Menu lainnya" })).toBeVisible();

  await page.getByRole("button", { name: "Panduan aplikasi" }).click();
  await expect(
    page.getByRole("heading", { name: /Selamat datang di SOBAT ADI/ })
  ).toBeVisible();

  await page.getByRole("button", { name: "Berikutnya" }).click();
  await expect(page.getByRole("heading", { name: /Unggah modul kuliah/ })).toBeVisible();

  await page.keyboard.press("Escape");
  await expect(page.getByRole("heading", { name: /Unggah modul kuliah/ })).toBeHidden();

  await page.locator('[data-testid="nav-mentor"]:visible').click();
  await expect(page.getByText("Dokumen Modul")).toBeVisible();
  await expectNoHorizontalOverflow(page);
});

test("target sentuh navigasi bawah minimal 44px", async ({ page }) => {
  await page.setViewportSize({ width: 375, height: 812 });
  await login(page, E2E_USERS.student);

  for (const id of ["nav-beranda", "nav-mentor", "nav-unggah", "nav-kuis", "nav-more"]) {
    const box = await page.locator(`[data-testid="${id}"]:visible`).boundingBox();
    expect(box, id).not.toBeNull();
    expect(box!.height, id).toBeGreaterThanOrEqual(44);
  }
});
