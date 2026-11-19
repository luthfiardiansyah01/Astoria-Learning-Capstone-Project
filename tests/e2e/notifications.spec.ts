import { expect, test } from "@playwright/test";
import { PrismaClient } from "@prisma/client";
import { E2E_USERS, login } from "./helpers";

const db = new PrismaClient();
let userId = "";

test.beforeAll(async () => {
  const user = await db.user.findUniqueOrThrow({ where: { email: E2E_USERS.student.email } });
  userId = user.id;
  await db.notification.deleteMany({ where: { userId } });
  await db.notification.createMany({
    data: [
      {
        userId,
        type: "task_due_soon",
        title: "Tenggat tugas besok",
        body: "Proyek SIM: Bab 4 perlu diselesaikan.",
        link: "/collab",
      },
      {
        userId,
        type: "badge_earned",
        title: "Lencana baru: Pejuang Streak",
        body: "Kamu belajar 7 hari berturut-turut.",
        link: "/",
      },
    ],
  });
});

test.afterAll(async () => {
  await db.notification.deleteMany({ where: { userId } });
  await db.$disconnect();
});

test("notifikasi tampil dan dapat ditandai dibaca", async ({ page }) => {
  await login(page, E2E_USERS.student);
  await page.goto("/collab");

  const bell = page.getByRole("button", { name: "Notifikasi, 2 belum dibaca" });
  await expect(bell).toBeVisible();
  await bell.click();

  await expect(page.getByText("Tenggat tugas besok")).toBeVisible();
  await expect(page.getByText("Lencana baru: Pejuang Streak")).toBeVisible();

  await page.getByRole("button", { name: "Tandai semua dibaca" }).click();
  await expect(page.getByRole("button", { name: "Notifikasi", exact: true })).toBeVisible();
});
