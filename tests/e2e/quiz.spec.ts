import { expect, test } from "@playwright/test";
import { E2E_USERS, gotoNav, login } from "./helpers";

test("kuis: generate → jawab → skor/XP tampil dan tidak menggandakan XP", async ({ page }) => {
  await login(page, E2E_USERS.student);
  const before = await (await page.request.get("/api/profile")).json();
  const beforeXp = before.profile.xp as number;

  await gotoNav(page, "kuis");

  await expect(page.getByText("Uji Pemahaman Modul")).toBeVisible();
  await page.getByRole("button", { name: /Modul E2E Ekonomi/ }).click();
  await expect(page.getByTestId("quiz-generate")).toBeEnabled();
  await page.getByTestId("quiz-generate").click();

  await expect(page.getByText("Apa itu permintaan?")).toBeVisible({ timeout: 20_000 });
  await page.getByTestId("quiz-answer-0").fill("Keinginan membeli barang pada harga tertentu.");
  await page.getByTestId("quiz-submit-0").click();

  await expect(page.getByText("Skor 100")).toBeVisible({ timeout: 20_000 });
  await expect(page.getByText("+20 XP")).toBeVisible();

  const firstProfile = await (await page.request.get("/api/profile")).json();
  expect(firstProfile.profile.xp).toBe(beforeXp + 20);

  await page.reload();
  const secondProfile = await (await page.request.get("/api/profile")).json();
  expect(secondProfile.profile.xp).toBe(beforeXp + 20);
});
