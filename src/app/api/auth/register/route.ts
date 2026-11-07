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
        // Semua akun baru langsung mendapat trial Premium 7 hari.
        plan: "premium",
        planExpiresAt: new Date(now.getTime() + TRIAL_MS),
        trialUsedAt: now,
      },
    });

    return NextResponse.json({
      user: { id: user.id, name: user.name, email: user.email },
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
