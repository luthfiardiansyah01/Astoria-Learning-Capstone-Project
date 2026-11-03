// GET /api/billing/payments — riwayat pembayaran pengguna saat ini.
import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { requireUser } from "@/lib/current-user";

export const dynamic = "force-dynamic";

export async function GET() {
  const auth = await requireUser();
  if (auth.res) return auth.res;

  const payments = await db.payment.findMany({
    where: { userId: auth.user.id },
    orderBy: { createdAt: "desc" },
    take: 20,
    select: {
      id: true,
      orderId: true,
      provider: true,
      amount: true,
      currency: true,
      status: true,
      durationDays: true,
      checkoutUrl: true,
      paidAt: true,
      expiresAt: true,
      createdAt: true,
    },
  });

  return NextResponse.json({ payments });
}
