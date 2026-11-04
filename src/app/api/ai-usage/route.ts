// GET /api/ai-usage — sisa kuota AI pengguna (per menit & per hari), tanpa menambah counter.
import { NextResponse } from "next/server";
import { requireUser } from "@/lib/current-user";
import {
  aiDayCounterName,
  getRateLimitStatus,
  secondsUntilWibMidnight,
} from "@/lib/rate-limit";
import { effectivePlan, PLAN_LIMITS } from "@/lib/plans";

export const dynamic = "force-dynamic";

export async function GET() {
  try {
    const auth = await requireUser();
    if (auth.res) return auth.res;

    const plan = effectivePlan(auth.user);
    const limits = PLAN_LIMITS[plan];
    const now = new Date();
    const [daily, minute] = await Promise.all([
      getRateLimitStatus(
        aiDayCounterName(now),
        auth.user.id,
        limits.aiPerDay,
        secondsUntilWibMidnight(now)
      ),
      getRateLimitStatus("ai-minute", auth.user.id, limits.aiPerMinute, 60),
    ]);

    return NextResponse.json({ plan, daily, minute });
  } catch (e) {
    console.error("[/api/ai-usage]", e);
    return NextResponse.json({ error: "Gagal memuat kuota AI" }, { status: 500 });
  }
}
