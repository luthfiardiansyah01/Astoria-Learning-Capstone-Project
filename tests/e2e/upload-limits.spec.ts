import { expect, test } from "@playwright/test";
import { E2E_USERS, login } from "./helpers";

test("checklist dokumen dan pemecahan otomatis", async ({ page }) => {
  await login(page, E2E_USERS.home);
  await page.locator('[data-testid="nav-unggah"]:visible').click();

  const text = "A".repeat(9000);
  await page.getByTestId("upload-content").fill(text);

  await expect(page.getByText("Pemeriksaan dokumen")).toBeVisible();
  await expect(page.getByText(/lebih 1\.000/)).toBeVisible();
  await expect(page.getByTestId("upload-submit")).toBeDisabled();

  await page.getByRole("button", { name: /Pecah menjadi 2 bagian/ }).click();
  await expect(page.getByText(/Pilih bagian yang akan diunggah/)).toBeVisible();
  await page.getByRole("button", { name: "Pakai bagian 1" }).click();

  await expect(page.getByTestId("upload-submit")).toBeEnabled();
  await expect(page.getByRole("button", { name: /Pecah menjadi/ })).toBeHidden();

  const res = await page.request.post("/api/documents", {
    data: { fileName: "uji-batas.txt", content: text },
  });
  expect(res.status()).toBe(413);
  const body = (await res.json()) as {
    code?: string;
    charCount?: number;
    maxChars?: number;
    suggestedParts?: number;
  };
  expect(body.code).toBe("doc_too_long");
  expect(body.charCount).toBe(9000);
  expect(body.maxChars).toBe(8000);
  expect(body.suggestedParts).toBe(2);
});
