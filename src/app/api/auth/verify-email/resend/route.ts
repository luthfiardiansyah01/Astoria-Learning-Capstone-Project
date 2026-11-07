import { logger } from "@/lib/logger";
// POST /api/auth/verify-email/resend — kirim ulang tautan verifikasi.
import { NextResponse } from "next/server";
import { requireUser } from "@/lib/current-user";
import { FALLBACK_RESPONSES } from "@/lib/fallback";
import { rateLimit, tooManyRequests } from "@/lib/rate-limit";
import { emailConfigured, sendEmail } from "@/lib/email";
import {
  createVerificationToken,
  verificationEmail,
  verificationUrl,
} from "@/lib/email-verification";

export async function POST() {
  try {
    const auth = await requireUser();
    if (auth.res) return auth.res;
    const user = auth.user;

    if (user.emailVerifiedAt) {
      return NextResponse.json({ error: "Email sudah terverifikasi." }, { status: 400 });
    }
    if (!user.email) {
      return NextResponse.json({ error: "Akun ini tidak memiliki email." }, { status: 400 });
    }
    if (!emailConfigured()) {
      return NextResponse.json(
        { error: "Pengiriman email belum dikonfigurasi. Hubungi admin." },
        { status: 503 }
      );
    }

    const limited = await rateLimit(
      "verify-email-resend",
      user.id,
      3,
      3600,
      { failClosed: true }
    );
    if (!limited.ok) return tooManyRequests(limited);

    const { token } = await createVerificationToken(user.id);
    const url = verificationUrl(token);
    const sent = await sendEmail({ to: user.email, ...verificationEmail(user.name, url) });
    if (!sent.ok) {
      return NextResponse.json({ error: "Gagal mengirim email. Coba lagi." }, { status: 502 });
    }

    return NextResponse.json({
      ok: true,
      ...(process.env.NODE_ENV !== "production" ? { verificationUrl: url } : {}),
    });
  } catch (e) {
    logger.error("[/api/auth/verify-email/resend POST]", { error: e });
    return NextResponse.json({ error: FALLBACK_RESPONSES.api_error }, { status: 500 });
  }
}
