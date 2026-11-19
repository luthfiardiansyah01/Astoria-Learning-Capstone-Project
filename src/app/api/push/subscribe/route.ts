import { logger } from "@/lib/logger";
// POST/DELETE /api/push/subscribe - kelola langganan Web Push perangkat.
import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { requireUser } from "@/lib/current-user";
import { pushSubscribeSchema, pushUnsubscribeSchema, readBody } from "@/lib/validation";

export async function POST(req: NextRequest) {
  try {
    const auth = await requireUser();
    if (auth.res) return auth.res;

    const parsed = await readBody(req, pushSubscribeSchema);
    if (!parsed.ok) return NextResponse.json({ error: parsed.error }, { status: 400 });

    const { endpoint, keys } = parsed.data;
    const userAgent = req.headers.get("user-agent")?.slice(0, 300) ?? null;

    await db.pushSubscription.upsert({
      where: { endpoint },
      update: { userId: auth.user.id, p256dh: keys.p256dh, auth: keys.auth, userAgent },
      create: {
        userId: auth.user.id,
        endpoint,
        p256dh: keys.p256dh,
        auth: keys.auth,
        userAgent,
      },
    });

    return NextResponse.json({ ok: true });
  } catch (e) {
    logger.error("[/api/push/subscribe POST]", { error: e });
    return NextResponse.json({ error: "Gagal mendaftarkan perangkat." }, { status: 500 });
  }
}

export async function DELETE(req: NextRequest) {
  try {
    const auth = await requireUser();
    if (auth.res) return auth.res;

    const parsed = await readBody(req, pushUnsubscribeSchema);
    if (!parsed.ok) return NextResponse.json({ error: parsed.error }, { status: 400 });

    await db.pushSubscription.deleteMany({
      where: { userId: auth.user.id, endpoint: parsed.data.endpoint },
    });
    return NextResponse.json({ ok: true });
  } catch (e) {
    logger.error("[/api/push/subscribe DELETE]", { error: e });
    return NextResponse.json({ error: "Gagal menghapus langganan." }, { status: 500 });
  }
}
