import { logger } from "@/lib/logger";
// GET /api/cron/reminders — ringkasan tenggat tugas via email (sekali per hari).
// Dipanggil oleh Vercel Cron dengan header Authorization: Bearer <CRON_SECRET>.
import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { emailConfigured, sendEmail } from "@/lib/email";
import { dueTasksEmail, type DueTask } from "@/lib/collab-email";
import { wibDayKey } from "@/lib/rate-limit";

export const dynamic = "force-dynamic";

const HORIZON_MS = 48 * 60 * 60 * 1000;

export async function GET(req: NextRequest) {
  const secret = process.env.CRON_SECRET?.trim();
  if (!secret) {
    return NextResponse.json({ error: "CRON_SECRET belum diatur." }, { status: 503 });
  }
  if (req.headers.get("authorization") !== `Bearer ${secret}`) {
    return NextResponse.json({ error: "Tidak berwenang." }, { status: 401 });
  }

  try {
    const now = new Date();
    const horizon = new Date(now.getTime() + HORIZON_MS);
    const day = wibDayKey(now);

    const users = await db.user.findMany({
      where: {
        email: { not: null },
        assignedTasks: {
          some: { status: { not: "done" }, dueDate: { not: null, lte: horizon } },
        },
      },
      select: { id: true, email: true, name: true },
      take: 200,
    });

    let sent = 0;
    let skipped = 0;

    for (const user of users) {
      const tasks = await db.task.findMany({
        where: {
          assigneeId: user.id,
          status: { not: "done" },
          dueDate: { not: null, lte: horizon },
        },
        orderBy: { dueDate: "asc" },
        take: 20,
        select: {
          title: true,
          dueDate: true,
          project: { select: { name: true } },
        },
      });
      if (!tasks.length) continue;

      // Dedupe: satu ringkasan per pengguna per hari (WIB).
      try {
        await db.notification.create({
          data: {
            userId: user.id,
            type: "task_due_digest",
            title: "Ringkasan tenggat tugas",
            body: `${tasks.length} tugas perlu perhatian.`,
            link: "/collab",
            dedupeKey: `due-digest:${day}:${user.id}`,
          },
        });
      } catch (e) {
        if ((e as { code?: string }).code === "P2002") {
          skipped += 1;
          continue;
        }
        throw e;
      }

      if (emailConfigured() && user.email) {
        const due: DueTask[] = tasks.map((t) => ({
          title: t.title,
          projectName: t.project.name,
          dueDate: t.dueDate!,
          overdue: t.dueDate!.getTime() < now.getTime(),
        }));
        await sendEmail({ to: user.email, ...dueTasksEmail({ name: user.name, tasks: due }) }).catch(
          () => null
        );
      }
      sent += 1;
    }

    return NextResponse.json({ ok: true, candidates: users.length, sent, skipped });
  } catch (e) {
    logger.error("[/api/cron/reminders]", { error: e });
    return NextResponse.json({ error: "Gagal menjalankan pengingat." }, { status: 500 });
  }
}
