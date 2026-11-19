import { expect, test, type Page } from "@playwright/test";
import { E2E_USERS, expectNoHorizontalOverflow, login } from "./helpers";

const expectFontSize = (page: Page, value: string) =>
  expect
    .poll(() => page.evaluate(() => document.documentElement.style.fontSize))
    .toBe(value);

const DEFAULTS = {
  theme: "system",
  fontScale: "normal",
  reducedMotion: false,
  emailReminders: true,
} as const;

test("pengaturan tema dan gerak minimal tersimpan", async ({ page }) => {
  await login(page, E2E_USERS.student);
  // Pastikan mulai dari nilai bawaan, apa pun sisa tes sebelumnya.
  await page.request.patch("/api/profile/settings", { data: DEFAULTS });

  try {
    await page.goto("/akun");

    await expect(page.getByRole("heading", { name: "Akun & Pengaturan" })).toBeVisible();
    await expect(page.getByText("Memuat pengaturan…")).toBeHidden();

    await page.getByLabel("Gelap").check();
    await expect(page.locator("html")).toHaveClass(/dark/);
    await page.getByRole("switch", { name: "Kurangi animasi" }).click();
    await page.getByLabel("Besar (112%)").check();
    await expectFontSize(page, "112%");
    await page.getByRole("button", { name: "Simpan pengaturan" }).click();

    await expect(page.getByText("Pengaturan berhasil disimpan.")).toBeVisible();
    await expect(page.locator("html")).toHaveClass(/dark/);
    await expect(page.locator("html")).toHaveAttribute("data-reduce-motion", "true");
    await expectFontSize(page, "112%");

    await page.reload();
    await expect(page.getByRole("heading", { name: "Akun & Pengaturan" })).toBeVisible();
    await expect(page.locator("html")).toHaveClass(/dark/);
    await expect(page.locator("html")).toHaveAttribute("data-reduce-motion", "true");
    await expectFontSize(page, "112%");
  } finally {
    // Kembalikan preferensi agar tes lain tidak terpengaruh.
    await page.request.patch("/api/profile/settings", { data: DEFAULTS });
  }
});

test("ukuran teks sangat besar tetap responsif di 375px", async ({ page }) => {
  await login(page, E2E_USERS.student);
  await page.setViewportSize({ width: 375, height: 812 });
  try {
    await page.request.patch("/api/profile/settings", {
      data: { ...DEFAULTS, fontScale: "xlarge" },
    });
    await page.reload();
    await expectFontSize(page, "125%");
    await expectNoHorizontalOverflow(page);

    await page.goto("/akun");
    await expect(page.getByRole("heading", { name: "Akun & Pengaturan" })).toBeVisible();
    await expectNoHorizontalOverflow(page);
  } finally {
    await page.request.patch("/api/profile/settings", { data: DEFAULTS });
  }
});
