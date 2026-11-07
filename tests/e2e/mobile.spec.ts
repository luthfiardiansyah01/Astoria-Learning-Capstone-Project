import { expect, test } from "@playwright/test";
import { E2E_USERS, expectNoHorizontalOverflow, gotoNav, login } from "./helpers";

test("smoke mobile 375x812 untuk Beranda, Mentor, dan Kuis", async ({ page }) => {
  await page.setViewportSize({ width: 375, height: 812 });
  await login(page, E2E_USERS.student);

  await expect(page.getByText(/Sapaan Mentor/)).toBeVisible();
  await expectNoHorizontalOverflow(page);

  await gotoNav(page, "mentor");
  await expect(page.getByText("Dokumen Modul")).toBeVisible();
  await expectNoHorizontalOverflow(page);

  await gotoNav(page, "kuis");
  await expect(page.getByText("Uji Pemahaman Modul")).toBeVisible();
  await expectNoHorizontalOverflow(page);
});

test("link Collab tersedia dan bisa dibuka di mobile 375px", async ({ page }) => {
  await page.setViewportSize({ width: 375, height: 812 });
  await login(page, E2E_USERS.student);

  const collab = page.getByTestId("nav-collab");
  await expect(collab).toBeVisible();
  await expectNoHorizontalOverflow(page);

  await collab.click();
  await expect(page).toHaveURL(/\/collab/);
  await expect(page.getByText(/Tim & Proyek Saya/i).first()).toBeVisible();
});
