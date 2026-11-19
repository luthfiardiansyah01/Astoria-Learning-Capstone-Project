import { logger } from "@/lib/logger";
// GET/POST /api/admin/broadcast — statistik dan siaran notifikasi ke semua pengguna.
import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { requireAdmin } from "@/lib/current-user";
import { sendPushToAll } from "@/lib/push";
import { broadcastSchema, readBody } from "@/lib/validation";
import { rateLimit } from "@/lib/rate-limit";
import { logAdminAction } from "@/lib/audit";

export const dynamic = "force-dynamic";

export async function GET() {
  try {
    const auth = await requireAdmin();
    if (auth.res) return auth.res;

    const [users, devices, grouped] = await Promise.all([
      db.user.count({ where: { role: { not: "admin" } } }),
      db.pushSubscription.count(),
      db.pushSubscription.groupBy({ by: ["userId"], _count: { _all: true } }),
    ]);

    return NextResponse.json({
      users,
      devices,
      subscribers: grouped.length,
    });
  } catch (e) {
    logger.error("[/api/admin/broadcast GET]", { error: e });
    return NextResponse.json({ error: "Gagal memuat statistik siaran." }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const auth = await requireAdmin();
    if (auth.res) return auth.res;

    const limit = await rateLimit("admin-broadcast", auth.user.id, 3, 600);
    if (!limit.ok) {
      return NextResponse.json(
        { error: "Terlalu banyak siaran. Coba lagi beberapa menit lagi." },
        { status: 429 }
      );
    }

    const parsed = await readBody(req, broadcastSchema);
    if (!parsed.ok) return NextResponse.json({ error: parsed.error }, { status: 400 });

    const { title, body, url } = parsed.data;
    const recipients = await db.user.findMany({
      where: { role: { not: "admin" } },
      select: { id: true },
    });

    if (recipients.length > 0) {
      await db.notification.createMany({
        data: recipients.map((u) => ({
          userId: u.id,
          type: "broadcast",
          title,
          body,
          link: url || "/",
          dedupeKey: null,
        })),
      });
    }

    const push = await sendPushToAll({
      title,
      body,
      url: url || "/",
      tag: "broadcast",
    });

    await logAdminAction({
      adminId: auth.user.id,
      action: "notification.broadcast",
      targetType: "broadcast",
      detail: {
        title,
        body,
        url: url || "/",
        users: recipients.length,
        devices: push.total,
        sent: push.sent,
        failed: push.failed,
        pushSkipped: push.skipped,
      },
    });

    return NextResponse.json({
      ok: true,
      users: recipients.length,
      devices: push.total,
      sent: push.sent,
      failed: push.failed,
      pushSkipped: push.skipped,
    });
  } catch (e) {
    logger.error("[/api/admin/broadcast POST]", { error: e });
    return NextResponse.json({ error: "Gagal mengirim siaran." }, { status: 500 });
  }
}
