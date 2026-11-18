import { logger } from "@/lib/logger";
// POST /api/auth/forgot-password — kirim tautan reset password.
// Selalu memberi respons generik agar tidak membocorkan keberadaan email.
import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { emailConfigured, sendEmail } from "@/lib/email";
import { forgotPasswordSchema, readBody } from "@/lib/validation";
import { clientIp, rateLimit, tooManyRequests } from "@/lib/rate-limit";
import {
  createPasswordResetToken,
  passwordResetEmail,
  passwordResetUrl,
} from "@/lib/password-reset";

const GENERIC = {
  ok: true,
  message: "Jika email terdaftar, tautan reset password sudah dikirim.",
};

export async function POST(req: NextRequest) {
  try {
    const limited = await rateLimit(
      "forgot-password",
      clientIp(req.headers),
      5,
      3600,
      { failClosed: true }
    );
    if (!limited.ok) return tooManyRequests(limited);

    const parsed = await readBody(req, forgotPasswordSchema);
    if (!parsed.ok) {
      return NextResponse.json({ error: parsed.error }, { status: 400 });
    }

    if (!emailConfigured()) {
      return NextResponse.json(GENERIC);
    }

    const user = await db.user.findUnique({ where: { email: parsed.data.email } });
    if (user?.email) {
      const { token } = await createPasswordResetToken(user.id);
      const url = passwordResetUrl(token);
      const mail = passwordResetEmail(user.name, url);
      await sendEmail({ to: user.email, ...mail }).catch((e) => {
        logger.error("[/api/auth/forgot-password] gagal kirim email", { error: e });
      });
    }

    return NextResponse.json(GENERIC);
  } catch (e) {
    logger.error("[/api/auth/forgot-password]", { error: e });
    // Tetap generik: jangan mengungkap detail internal.
    return NextResponse.json(GENERIC);
  }
}
