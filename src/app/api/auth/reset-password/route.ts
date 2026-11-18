import { logger } from "@/lib/logger";
// POST /api/auth/reset-password — tukar token reset dengan password baru.
import { NextRequest, NextResponse } from "next/server";
import { readBody, resetPasswordSchema } from "@/lib/validation";
import { clientIp, rateLimit, tooManyRequests } from "@/lib/rate-limit";
import { consumePasswordResetToken } from "@/lib/password-reset";

export async function POST(req: NextRequest) {
  try {
    const limited = await rateLimit(
      "reset-password",
      clientIp(req.headers),
      10,
      3600,
      { failClosed: true }
    );
    if (!limited.ok) return tooManyRequests(limited);

    const parsed = await readBody(req, resetPasswordSchema);
    if (!parsed.ok) {
      return NextResponse.json({ error: parsed.error }, { status: 400 });
    }

    const result = await consumePasswordResetToken(
      parsed.data.token,
      parsed.data.password
    );
    if (!result.ok) {
      const message =
        result.reason === "expired"
          ? "Tautan reset sudah kedaluwarsa. Minta tautan baru."
          : "Tautan reset tidak valid atau sudah dipakai.";
      return NextResponse.json({ error: message }, { status: 400 });
    }

    return NextResponse.json({ ok: true });
  } catch (e) {
    logger.error("[/api/auth/reset-password]", { error: e });
    return NextResponse.json(
      { error: "Gagal mengatur ulang password. Coba lagi." },
      { status: 500 }
    );
  }
}
