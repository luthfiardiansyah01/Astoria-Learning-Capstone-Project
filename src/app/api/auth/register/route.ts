import { logger } from "@/lib/logger";
// POST /api/auth/register — buat akun mahasiswa baru untuk Astoria Collab

import { NextRequest, NextResponse } from "next/server";
import bcrypt from "bcryptjs";
import { Prisma } from "@prisma/client";
import { db } from "@/lib/db";
import { FALLBACK_RESPONSES } from "@/lib/fallback";
import { clientIp, LIMITS, rateLimit, tooManyRequests } from "@/lib/rate-limit";
import { TRIAL_MS } from "@/lib/plans";
import { readBody, registerSchema } from "@/lib/validation";
import { emailConfigured, sendEmail } from "@/lib/email";
import {
  createVerificationToken,
  verificationEmail,
  verificationUrl,
} from "@/lib/email-verification";
import { turnstileConfigured, verifyTurnstile } from "@/lib/turnstile";

export async function POST(req: NextRequest) {
  try {
    const ip = clientIp(req.headers);
    const limit = await rateLimit("register", ip, LIMITS.register.max, LIMITS.register.windowSec, {
      failClosed: true,
    });
    if (!limit.ok) return tooManyRequests(limit);

    const parsed = await readBody(req, registerSchema);
    if (!parsed.ok) {
      return NextResponse.json({ error: parsed.error }, { status: 400 });
    }
    const name = parsed.data.name;
    const email = parsed.data.email.toLowerCase();
    const password = parsed.data.password;

    // Honeypot: hanya bot yang mengisi field tersembunyi ini.
    if (parsed.data.website?.trim()) {
      return NextResponse.json({ error: "Pendaftaran tidak valid." }, { status: 400 });
    }

    if (turnstileConfigured()) {
      const captcha = await verifyTurnstile(parsed.data.turnstileToken, ip);
      if (!captcha.ok) {
        return NextResponse.json(
          { error: captcha.error ?? "CAPTCHA tidak valid." },
          { status: 400 }
        );
      }
    }

    const verificationEnabled = process.env.EMAIL_VERIFICATION_ENABLED === "true";
    if (verificationEnabled && !emailConfigured()) {
      return NextResponse.json(
        { error: "Verifikasi email belum dikonfigurasi. Hubungi admin." },
        { status: 503 }
      );
    }

    const existing = await db.user.findUnique({ where: { email } });
    if (existing) {
      return NextResponse.json(
        { error: "Email ini sudah terdaftar." },
        { status: 409 }
      );
    }

    const passwordHash = await bcrypt.hash(password, 10);
    const now = new Date();
    const user = await db.user.create({
      data: {
        name,
        email,
        passwordHash,
        role: "mahasiswa",
        // Trial Premium hanya diberikan setelah email terverifikasi.
        plan: verificationEnabled ? "free" : "premium",
        planExpiresAt: verificationEnabled ? null : new Date(now.getTime() + TRIAL_MS),
        trialUsedAt: verificationEnabled ? null : now,
        emailVerifiedAt: verificationEnabled ? null : now,
      },
    });

    let devVerificationUrl: string | undefined;
    if (verificationEnabled) {
      const { token } = await createVerificationToken(user.id);
      const url = verificationUrl(token);
      const mail = verificationEmail(name, url);
      const sent = await sendEmail({ to: email, ...mail });
      if (!sent.ok) {
        await db.user.delete({ where: { id: user.id } }).catch(() => null);
        return NextResponse.json(
          { error: "Gagal mengirim email verifikasi. Coba lagi beberapa saat." },
          { status: 502 }
        );
      }
      if (process.env.NODE_ENV !== "production") devVerificationUrl = url;
    }

    return NextResponse.json({
      user: { id: user.id, name: user.name, email: user.email },
      verificationRequired: verificationEnabled,
      ...(devVerificationUrl ? { verificationUrl: devVerificationUrl } : {}),
    });
  } catch (e) {
    if (e instanceof Prisma.PrismaClientKnownRequestError && e.code === "P2002") {
      return NextResponse.json({ error: "Email ini sudah terdaftar." }, { status: 409 });
    }
    logger.error("[/api/auth/register]", { error: e });
    return NextResponse.json(
      { error: FALLBACK_RESPONSES.api_error, code: "api_error" },
      { status: 500 }
    );
  }
}
