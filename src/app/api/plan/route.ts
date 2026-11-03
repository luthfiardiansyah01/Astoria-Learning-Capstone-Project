// GET  /api/plan — paket aktif, limit, dan status trial.
// POST /api/plan — aktifkan trial Premium 7 hari (sekali per akun, tanpa pembayaran).
import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { requireUser } from "@/lib/current-user";
import { effectivePlan, PLAN_LIMITS, PLAN_META } from "@/lib/plans";

export const dynamic = "force-dynamic";

export async function GET() {
  try {
    const auth = await requireUser();
    if (auth.res) return auth.res;

    const plan = effectivePlan(auth.user);
    return NextResponse.json({
      plan,
      meta: PLAN_META[plan],
      limits: PLAN_LIMITS[plan],
      planExpiresAt: auth.user.planExpiresAt,
      trialUsedAt: auth.user.trialUsedAt,
    });
  } catch (e) {
    console.error("[/api/plan GET]", e);
    return NextResponse.json({ error: "Gagal memuat paket." }, { status: 500 });
  }
}

export async function POST() {
  try {
    const auth = await requireUser();
    if (auth.res) return auth.res;
    const user = auth.user;

    if (effectivePlan(user) === "premium") {
      return NextResponse.json({ error: "Akun ini sudah Premium." }, { status: 400 });
    }
    if (user.trialUsedAt) {
      return NextResponse.json(
        { error: "Masa trial Premium sudah pernah digunakan." },
        { status: 403 }
      );
    }

    const planExpiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000);
    await db.user.update({
      where: { id: user.id },
      data: {
        plan: "premium",
        planExpiresAt,
        trialUsedAt: new Date(),
      },
    });

    return NextResponse.json({
      plan: "premium",
      planExpiresAt,
      message: "Trial Premium 7 hari aktif.",
    });
  } catch (e) {
    console.error("[/api/plan POST]", e);
    return NextResponse.json({ error: "Gagal mengaktifkan trial." }, { status: 500 });
  }
}
