import { expect, test } from "@playwright/test";
import { E2E_USERS, expectNoHorizontalOverflow, login } from "./helpers";

test("semua menu utama dapat dibuka", async ({ page }) => {
  await login(page, E2E_USERS.student);
  await expect(page.getByText(/Sapaan Mentor/)).toBeVisible();

  await page.locator('[data-testid="nav-mentor"]:visible').click();
  await expect(page.getByText("Dokumen Modul")).toBeVisible();

  await page.locator('[data-testid="nav-unggah"]:visible').click();
  await expect(page.getByText("Unggah Modul Kuliah")).toBeVisible();

  await page.locator('[data-testid="nav-kuis"]:visible').click();
  await expect(page.getByText("Uji Pemahaman Modul")).toBeVisible();

  await page.locator('[data-testid="nav-beranda"]:visible').click();
  await expect(page.getByText(/Sapaan Mentor/)).toBeVisible();

  await page.getByTestId("nav-collab").click();
  await expect(page).toHaveURL(/\/collab/);
  await expect(page.getByText(/Tim & Proyek Saya/i).first()).toBeVisible();

  await page.goto("/collab/analytics");
  await expect(page.getByText(/Dashboard Analitik|Belum ada tim untuk dianalisis/)).toBeVisible();

  await page.goto("/akun");
  await expect(page.getByRole("heading", { name: "Akun & Pengaturan" })).toBeVisible();
  await expect(page.getByText("Notifikasi di perangkat")).toBeVisible();

  await page.goto("/legal/aksesibilitas");
  await expect(page.getByRole("heading", { name: "Pernyataan Aksesibilitas" })).toBeVisible();

  await page.goto("/produk");
  await expect(page.locator("h1")).toBeVisible();
});

test("menu mobile lengkap dan panduan dapat dibuka", async ({ page }) => {
  await page.setViewportSize({ width: 375, height: 812 });
  await login(page, E2E_USERS.student);

  for (const id of ["nav-beranda", "nav-mentor", "nav-unggah", "nav-kuis", "nav-more"]) {
    await expect(page.locator(`[data-testid="${id}"]:visible`)).toBeVisible();
  }

  await page.getByTestId("nav-more").click();
  await expect(page.getByRole("heading", { name: "Menu lainnya" })).toBeVisible();
  for (const label of [
    "Panduan aplikasi",
    "Collab: tim dan proyek",
    "Akun dan keamanan",
    "Pernyataan aksesibilitas",
  ]) {
    await expect(page.getByText(label)).toBeVisible();
  }

  await page.getByRole("button", { name: "Panduan aplikasi" }).click();
  await expect(
    page.getByRole("heading", { name: /Selamat datang di SOBAT ADI/ })
  ).toBeVisible();
  await page.keyboard.press("Escape");

  await expectNoHorizontalOverflow(page);
});

test("menu admin tersedia untuk admin", async ({ page }) => {
  await login(page, E2E_USERS.admin);
  const adminNav = page.locator('[data-testid="nav-admin"]:visible');
  await expect(adminNav).toBeVisible();
  await adminNav.click();
  await expect(page.getByText("Manajemen & Moderasi Dokumen")).toBeVisible();
});
