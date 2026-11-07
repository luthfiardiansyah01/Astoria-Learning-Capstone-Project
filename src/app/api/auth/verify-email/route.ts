import { logger } from "@/lib/logger";
// POST /api/auth/verify-email — verifikasi token email sekali pakai.
import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { readBody } from "@/lib/validation";
import { verifyEmailToken } from "@/lib/email-verification";
import { FALLBACK_RESPONSES } from "@/lib/fallback";

const schema = z.object({
  token: z.string().min(10, "Token tidak valid.").max(500, "Token tidak valid."),
});

export async function POST(req: NextRequest) {
  try {
    const parsed = await readBody(req, schema);
    if (!parsed.ok) return NextResponse.json({ error: parsed.error }, { status: 400 });

    const result = await verifyEmailToken(parsed.data.token);
    if (!result.ok) {
      return NextResponse.json(
        { error: "Tautan verifikasi tidak valid atau sudah kedaluwarsa." },
        { status: 400 }
      );
    }

    return NextResponse.json({
      ok: true,
      trialGranted: result.trialGranted,
      plan: result.user.plan,
    });
  } catch (e) {
    logger.error("[/api/auth/verify-email POST]", { error: e });
    return NextResponse.json({ error: FALLBACK_RESPONSES.api_error }, { status: 500 });
  }
}
