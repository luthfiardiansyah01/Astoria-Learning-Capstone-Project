// PATCH /api/admin/users/[userId]/plan — ubah paket pengguna (khusus admin).
import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { requireAdmin } from "@/lib/current-user";
import { effectivePlan } from "@/lib/plans";
import { readBody, adminPlanUpdateSchema } from "@/lib/validation";
import { createNotification } from "@/lib/collab-notify";

export const dynamic = "force-dynamic";

const DAY_MS = 24 * 60 * 60 * 1000;

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ userId: string }> }
) {
  const auth = await requireAdmin();
  if (auth.res) return auth.res;

  const { userId } = await params;
  const parsed = await readBody(req, adminPlanUpdateSchema);
  if (!parsed.ok) return NextResponse.json({ error: parsed.error }, { status: 400 });

  const target = await db.user.findUnique({ where: { id: userId } });
  if (!target) return NextResponse.json({ error: "Pengguna tidak ditemukan." }, { status: 404 });
  if (target.role === "admin") {
    return NextResponse.json(
      { error: "Akun admin selalu Premium dan tidak bisa diubah dari panel ini." },
      { status: 400 }
    );
  }

  const { plan, days, resetTrial } = parsed.data;
  const planExpiresAt =
    plan === "premium" ? (days && days > 0 ? new Date(Date.now() + days * DAY_MS) : null) : null;

  const updated = await db.user.update({
    where: { id: userId },
    data: {
      plan,
      planExpiresAt,
      ...(resetTrial ? { trialUsedAt: null } : {}),
    },
    select: {
      id: true,
      name: true,
      email: true,
      role: true,
      plan: true,
      planExpiresAt: true,
      trialUsedAt: true,
    },
  });

  await createNotification(userId, {
    type: "plan_updated",
    title: plan === "premium" ? "Premium aktif 🎉" : "Paket diubah ke Free",
    body:
      plan === "premium"
        ? `Aktif sampai ${planExpiresAt ? planExpiresAt.toLocaleDateString("id-ID") : "tanpa batas waktu"}.`
        : `Diubah oleh ${auth.user.name}.`,
    link: "/",
  }).catch(() => null);

  return NextResponse.json({ user: { ...updated, effectivePlan: effectivePlan(updated) } });
}
