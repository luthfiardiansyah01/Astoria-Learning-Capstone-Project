import { expect, test } from "@playwright/test";
import { E2E_USERS, gotoNav, login } from "./helpers";

test.afterEach(async ({ page }) => {
  const res = await page.request.get("/api/documents").catch(() => null);
  if (!res?.ok()) return;
  const body = (await res.json()) as { documents: { id: string; fileName: string; status: string }[] };
  const doc = body.documents.find((d) => d.fileName === "Modul Pending E2E");
  if (doc && doc.status !== "pending") {
    await page.request.post("/api/admin/decision", {
      data: { documentId: doc.id, decision: "pending" },
    });
  }
});

test("admin memoderasi dokumen pending", async ({ page }) => {
  await login(page, E2E_USERS.admin);
  await gotoNav(page, "admin");

  await expect(page.getByText("Manajemen & Moderasi Dokumen")).toBeVisible({ timeout: 20_000 });
  await expect(page.getByText("Paket & Pembayaran")).toBeVisible();

  const row = page.locator("div.rounded-xl.border.p-4").filter({ hasText: "Modul Pending E2E" }).first();
  await expect(row).toBeVisible();
  await row.getByRole("button", { name: /Aktifkan/ }).click();

  await expect
    .poll(
      async () => {
        const res = await page.request.get("/api/documents");
        const body = (await res.json()) as { documents: { fileName: string; status: string }[] };
        return body.documents.find((d) => d.fileName === "Modul Pending E2E")?.status;
      },
      { timeout: 15_000 }
    )
    .toBe("approved");
});

test("pengguna biasa tidak melihat menu admin dan ditolak API admin", async ({ page }) => {
  await login(page, E2E_USERS.student);

  await expect(page.getByTestId("nav-admin")).toHaveCount(0);
  const res = await page.request.get("/api/admin/users");
  expect(res.status()).toBe(403);
});
