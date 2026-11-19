import { logger } from "@/lib/logger";
// POST /api/profile/password - ganti password dengan verifikasi password lama.
import bcrypt from "bcryptjs";
import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { requireUser } from "@/lib/current-user";
import { changePasswordSchema, readBody } from "@/lib/validation";
import { rateLimit, tooManyRequests } from "@/lib/rate-limit";

export async function POST(req: NextRequest) {
  try {
    const auth = await requireUser();
    if (auth.res) return auth.res;
    const user = auth.user;

    const limited = await rateLimit("change-password", user.id, 5, 3600, {
      failClosed: true,
    });
    if (!limited.ok) return tooManyRequests(limited);

    if (!user.passwordHash) {
      return NextResponse.json(
        { error: "Akun ini tidak memakai password. Hubungi admin." },
        { status: 400 }
      );
    }

    const parsed = await readBody(req, changePasswordSchema);
    if (!parsed.ok) {
      return NextResponse.json({ error: parsed.error }, { status: 400 });
    }

    const { currentPassword, newPassword } = parsed.data;
    const matches = await bcrypt.compare(currentPassword, user.passwordHash);
    if (!matches) {
      return NextResponse.json({ error: "Password saat ini salah." }, { status: 400 });
    }
    if (currentPassword === newPassword) {
      return NextResponse.json(
        { error: "Password baru harus berbeda dari password lama." },
        { status: 400 }
      );
    }

    const passwordHash = await bcrypt.hash(newPassword, 12);
    await db.user.update({ where: { id: user.id }, data: { passwordHash } });

    return NextResponse.json({ ok: true });
  } catch (e) {
    logger.error("[/api/profile/password POST]", { error: e });
    return NextResponse.json({ error: "Gagal mengganti password." }, { status: 500 });
  }
}
