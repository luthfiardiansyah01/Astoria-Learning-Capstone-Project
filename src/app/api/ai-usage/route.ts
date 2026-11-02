// GET /api/ai-usage — sisa kuota AI pengguna (per menit & per hari), tanpa menambah counter.
import { NextResponse } from "next/server";
import { requireUser } from "@/lib/current-user";
import { getRateLimitStatus, LIMITS } from "@/lib/rate-limit";

export const dynamic = "force-dynamic";

export async function GET() {
  try {
    const auth = await requireUser();
    if (auth.res) return auth.res;

    const [daily, minute] = await Promise.all([
      getRateLimitStatus(
        "ai-day",
        auth.user.id,
        LIMITS.aiPerDay.max,
        LIMITS.aiPerDay.windowSec
      ),
      getRateLimitStatus(
        "ai-minute",
        auth.user.id,
        LIMITS.aiPerMinute.max,
        LIMITS.aiPerMinute.windowSec
      ),
    ]);

    return NextResponse.json({ daily, minute });
  } catch (e) {
    console.error("[/api/ai-usage]", e);
    return NextResponse.json({ error: "Gagal memuat kuota AI" }, { status: 500 });
  }
}
