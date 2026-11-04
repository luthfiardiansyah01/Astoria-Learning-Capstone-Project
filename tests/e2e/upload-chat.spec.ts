import { expect, test } from "@playwright/test";
import { E2E_USERS, gotoNav, login } from "./helpers";

test.afterEach(async ({ page }) => {
  const res = await page.request.get("/api/documents").catch(() => null);
  if (!res?.ok()) return;
  const body = (await res.json()) as { documents: { id: string; fileName: string }[] };
  for (const doc of body.documents ?? []) {
    if (doc.fileName === "Modul E2E Upload") {
      await page.request.delete(`/api/documents/${doc.id}`);
    }
  }
});

const CONTENT =
  "BAB 1 PENGANTAR EKONOMI. Permintaan adalah keinginan membeli barang pada harga tertentu. " +
  "Hukum permintaan menyatakan harga naik maka permintaan turun. Penawaran adalah jumlah barang yang dijual.";

test("unggah dokumen → ekstraksi → chat menjawab dengan referensi", async ({ page }) => {
  await login(page, E2E_USERS.student);
  await gotoNav(page, "unggah");

  await page.getByTestId("upload-filename").fill("Modul E2E Upload");
  await page.getByTestId("upload-content").fill(CONTENT);
  const uploadResponse = page.waitForResponse(
    (res) => res.url().includes("/api/documents") && res.request().method() === "POST",
    { timeout: 30_000 }
  );
  await page.getByTestId("upload-submit").click();
  const response = await uploadResponse;
  expect(response.status(), await response.text()).toBe(200);

  await expect(page.getByText("Dokumen Aktif")).toBeVisible({ timeout: 30_000 });
  await expect(page.getByText("Modul E2E Upload").first()).toBeVisible();

  await gotoNav(page, "mentor");
  await expect(page.getByText("Dokumen Modul")).toBeVisible();
  await expect(page.getByText("Modul E2E Upload").first()).toBeVisible();

  await page.getByTestId("chat-input").fill("Apa itu permintaan?");
  await page.getByTestId("chat-send").click();

  await expect(page.getByText(/Penjelasan/).first()).toBeVisible({ timeout: 20_000 });
  await expect(page.getByText(/Referensi: Bab 1/).first()).toBeVisible();

  await page.reload();
  await gotoNav(page, "mentor");
  await expect(page.getByText(/Penjelasan/).first()).toBeVisible();
});
