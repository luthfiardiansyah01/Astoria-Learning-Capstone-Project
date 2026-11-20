import { expect, test } from "@playwright/test";
import { E2E_USERS, expectNoHorizontalOverflow, login } from "./helpers";

test.describe.configure({ timeout: 180_000 });

test("halaman publik responsif 320 sampai 1440", async ({ page }) => {
  const routes = ["/login", "/produk", "/legal/aksesibilitas"];
  for (const width of [320, 768, 1024, 1440]) {
    await page.setViewportSize({ width, height: 900 });
    for (const route of routes) {
      await page.goto(route);
      await page.waitForLoadState("domcontentloaded");
      await expectNoHorizontalOverflow(page);
    }
  }
});

test("halaman pengguna responsif 320 sampai 1440", async ({ page }) => {
  await login(page, E2E_USERS.student);
  const routes = ["/", "/?view=unggah", "/?view=mentor", "/collab", "/akun"];
  for (const width of [320, 768, 1024, 1440]) {
    await page.setViewportSize({ width, height: 900 });
    for (const route of routes) {
      await page.goto(route);
      await page.waitForLoadState("domcontentloaded");
      await expectNoHorizontalOverflow(page);
    }
  }
});

test("panel admin responsif 1024 dan 1440", async ({ page }) => {
  await login(page, E2E_USERS.admin);
  for (const width of [1024, 1440]) {
    await page.setViewportSize({ width, height: 900 });
    await page.goto("/?view=admin");
    await page.waitForLoadState("domcontentloaded");
    await expectNoHorizontalOverflow(page);
  }
});

test("navigasi berpindah dari bawah ke header pada 1280", async ({ page }) => {
  await page.setViewportSize({ width: 1024, height: 900 });
  await login(page, E2E_USERS.student);
  await expect(page.getByTestId("nav-more")).toBeVisible();

  await page.setViewportSize({ width: 1440, height: 900 });
  await expect(page.getByTestId("nav-more")).toBeHidden();
  await expect(page.locator('[data-testid="nav-beranda"]:visible')).toBeVisible();
  const bell = await page.locator('[data-testid="nav-beranda"]:visible').count();
  expect(bell).toBeGreaterThan(0);
});
