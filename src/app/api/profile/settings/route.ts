import { logger } from "@/lib/logger";
// GET/PATCH /api/profile/settings — preferensi tampilan dan notifikasi pengguna.
import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { requireUser } from "@/lib/current-user";
import { profileSettingsSchema, readBody } from "@/lib/validation";

export const dynamic = "force-dynamic";

export async function GET() {
  try {
    const auth = await requireUser();
    if (auth.res) return auth.res;

    const user = await db.user.findUnique({
      where: { id: auth.user.id },
      select: {
        name: true,
        email: true,
        theme: true,
        fontScale: true,
        reducedMotion: true,
        emailReminders: true,
      },
    });
    if (!user) {
      return NextResponse.json({ error: "Pengguna tidak ditemukan." }, { status: 404 });
    }
    return NextResponse.json(user);
  } catch (e) {
    logger.error("[/api/profile/settings GET]", { error: e });
    return NextResponse.json({ error: "Gagal memuat pengaturan." }, { status: 500 });
  }
}

export async function PATCH(req: NextRequest) {
  try {
    const auth = await requireUser();
    if (auth.res) return auth.res;

    const parsed = await readBody(req, profileSettingsSchema);
    if (!parsed.ok) {
      return NextResponse.json({ error: parsed.error }, { status: 400 });
    }

    const { name, theme, fontScale, reducedMotion, emailReminders } = parsed.data;
    const updated = await db.user.update({
      where: { id: auth.user.id },
      data: {
        ...(name !== undefined ? { name } : {}),
        ...(theme !== undefined ? { theme } : {}),
        ...(fontScale !== undefined ? { fontScale } : {}),
        ...(reducedMotion !== undefined ? { reducedMotion } : {}),
        ...(emailReminders !== undefined ? { emailReminders } : {}),
      },
      select: {
        name: true,
        email: true,
        theme: true,
        fontScale: true,
        reducedMotion: true,
        emailReminders: true,
      },
    });

    return NextResponse.json(updated);
  } catch (e) {
    logger.error("[/api/profile/settings PATCH]", { error: e });
    return NextResponse.json({ error: "Gagal menyimpan pengaturan." }, { status: 500 });
  }
}
