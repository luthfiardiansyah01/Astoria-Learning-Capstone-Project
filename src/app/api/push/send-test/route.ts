import { logger } from "@/lib/logger";
// POST /api/push/send-test â€” kirim notifikasi uji ke perangkat pengguna.
import { NextResponse } from "next/server";
import { requireUser } from "@/lib/current-user";
import { sendPushToUser } from "@/lib/push";
import { rateLimit } from "@/lib/rate-limit";

export const dynamic = "force-dynamic";

export async function POST() {
  try {
    const auth = await requireUser();
    if (auth.res) return auth.res;

    const limit = await rateLimit("push-test", auth.user.id, 5, 60);
    if (!limit.ok) {
      return NextResponse.json(
        { error: "Terlalu banyak permintaan. Coba lagi sebentar." },
        { status: 429 }
      );
    }

    const result = await sendPushToUser(auth.user.id, {
      title: "Uji notifikasi SOBAT ADI",
      body: "Web Push berhasil. Notifikasi perangkat aktif.",
      url: "/akun",
      tag: "push-test",
    });

    if (result.skipped) {
      return NextResponse.json(
        { error: "Web Push belum dikonfigurasi di server." },
        { status: 503 }
      );
    }
    if (result.sent === 0) {
      return NextResponse.json(
        { error: "Belum ada perangkat terdaftar. Aktifkan notifikasi dulu." },
        { status: 409 }
      );
    }
    return NextResponse.json({ ok: true, sent: result.sent });
  } catch (e) {
    logger.error("[/api/push/send-test]", { error: e });
    return NextResponse.json({ error: "Gagal mengirim notifikasi uji." }, { status: 500 });
  }
}

