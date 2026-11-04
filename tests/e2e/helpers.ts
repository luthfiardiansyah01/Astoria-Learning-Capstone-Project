import { expect, type Page } from "@playwright/test";
import { E2E_USERS } from "./users";

export { E2E_USERS };

export type TestUser = { email: string; name: string; password: string };

export async function login(page: Page, user: TestUser = E2E_USERS.student) {
  await page.goto("/login");
  await page.fill("#email", user.email);
  await page.fill("#password", user.password);
  await page.getByRole("button", { name: "Masuk", exact: true }).click();
  await expect(page.getByText(/Sapaan Mentor/)).toBeVisible({ timeout: 20_000 });
}

export async function logout(page: Page) {
  await page.getByTestId("logout").click();
  await expect(page).toHaveURL(/\/login/);
}

export function nav(page: Page, key: "beranda" | "mentor" | "unggah" | "kuis" | "admin") {
  return page.locator(`[data-testid="nav-${key}"]:visible`);
}

export async function gotoNav(
  page: Page,
  key: "beranda" | "mentor" | "unggah" | "kuis" | "admin"
) {
  await nav(page, key).click();
}

export async function expectNoHorizontalOverflow(page: Page) {
  const result = await page.evaluate(() => {
    const overflow = document.documentElement.scrollWidth - window.innerWidth;
    const offenders = [...document.querySelectorAll<HTMLElement>("body *")]
      .map((el) => {
        const rect = el.getBoundingClientRect();
        return {
          tag: el.tagName.toLowerCase(),
          testid: el.dataset.testid ?? null,
          className: typeof el.className === "string" ? el.className.slice(0, 120) : "",
          right: Math.round(rect.right),
          width: Math.round(rect.width),
        };
      })
      .filter((el) => el.right > window.innerWidth + 1)
      .slice(0, 8);
    return { overflow, offenders };
  });
  expect(result.overflow, JSON.stringify(result.offenders, null, 2)).toBeLessThanOrEqual(1);
}

export function uniqueEmail(prefix = "e2e-register") {
  return `${prefix}-${Date.now()}@example.com`;
}
