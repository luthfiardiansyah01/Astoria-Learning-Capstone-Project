import { expect, type Locator, type Page, test } from "@playwright/test";
import { E2E_USERS, login } from "./helpers";

test.afterEach(async ({ page }) => {
  await page.waitForTimeout(300);
  const res = await page.request.get("/api/collab/teams").catch(() => null);
  if (!res?.ok()) return;
  const body = (await res.json()) as { teams: { id: string; name: string }[] };
  for (const team of body.teams ?? []) {
    if (team.name.startsWith("Tim E2E")) {
      await page.request.delete(`/api/collab/teams/${team.id}`);
    }
  }
});

async function dragTaskToColumn(page: Page, card: Locator, status: string) {
  const column = page.getByTestId(`kanban-${status}`);
  await card.scrollIntoViewIfNeeded();
  await column.scrollIntoViewIfNeeded();
  await page.waitForTimeout(300);

  const box = await card.boundingBox();
  const target = await column.boundingBox();
  if (!box || !target) throw new Error("Posisi kartu/kolom tidak ditemukan");

  await page.mouse.move(box.x + box.width / 2, box.y + 20);
  await page.mouse.down();
  await page.mouse.move(box.x + box.width / 2 + 12, box.y + 32, { steps: 5 });
  await page.waitForTimeout(120);
  await page.mouse.move(target.x + target.width / 2, target.y + 100, { steps: 25 });
  await page.waitForTimeout(120);
  await page.mouse.up();
}

test("tim → anggota → proyek → tugas → Mentor AI → geser Kanban", async ({ page }) => {
  await login(page, E2E_USERS.student);

  await page.getByTestId("nav-collab").click();
  await expect(page.getByText("Tim & Proyek Saya")).toBeVisible();

  await page.getByRole("button", { name: /Tim Baru/ }).click();
  await page.fill("#team-name", "Tim E2E");
  await page.getByRole("button", { name: "Buat Tim", exact: true }).click();
  await expect(page.getByText("Tim E2E").first()).toBeVisible({ timeout: 15_000 });

  await page.getByPlaceholder("Cari nama anggota baru").fill(E2E_USERS.helper.name);
  await page.getByTestId("add-member-submit").click();
  await expect(page.getByText(E2E_USERS.helper.name).first()).toBeVisible({ timeout: 15_000 });

  await page.getByRole("button", { name: /Proyek Baru/ }).click();
  await page.fill("#project-name", "Proyek E2E");
  await page.getByRole("button", { name: "Buat Proyek", exact: true }).click();
  await expect(page.getByText("Proyek E2E").first()).toBeVisible({ timeout: 15_000 });

  await page.getByText("Proyek E2E", { exact: true }).first().click();
  await expect(page.getByPlaceholder("Tambah tugas baru...")).toBeVisible({ timeout: 15_000 });
  const projectId = page.url().split("/").pop() ?? "";

  await page.getByTestId("task-new-title").fill("Tugas E2E");
  await page.getByTestId("task-new-submit").click();
  await expect(page.getByTestId("task-card").filter({ hasText: "Tugas E2E" })).toBeVisible();

  await page.getByTestId("task-card").filter({ hasText: "Tugas E2E" }).click();
  await expect(page.getByTestId("task-mentor-input")).toBeVisible({ timeout: 15_000 });
  await page.getByTestId("task-mentor-input").fill("Apa langkah pertama mengerjakan tugas ini?");
  await page.getByTestId("task-mentor-send").click();
  await expect(page.getByText(/Saran mentor/).first()).toBeVisible({ timeout: 20_000 });

  await page.keyboard.press("Escape");
  await expect(page.getByTestId("task-mentor-input")).toBeHidden();

  const card = page.getByTestId("task-card").filter({ hasText: "Tugas E2E" }).first();
  await dragTaskToColumn(page, card, "done");
  await expect(page.getByTestId("kanban-done")).toContainText("Tugas E2E", { timeout: 15_000 });
  await expect
    .poll(
      async () => {
        const res = await page.request.get(`/api/collab/projects/${projectId}`);
        if (!res.ok()) return null;
        const body = (await res.json()) as { project: { tasks: { title: string; status: string }[] } };
        return body.project.tasks.find((t) => t.title === "Tugas E2E")?.status;
      },
      { timeout: 15_000 }
    )
    .toBe("done");
});
