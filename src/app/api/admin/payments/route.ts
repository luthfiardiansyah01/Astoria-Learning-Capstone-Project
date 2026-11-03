// GET /api/admin/payments — transaksi pembayaran + status konfigurasi gateway.
import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { requireAdmin } from "@/lib/current-user";
import { billingConfig } from "@/lib/billing";

export const dynamic = "force-dynamic";

export async function GET() {
  const auth = await requireAdmin();
  if (auth.res) return auth.res;

  const [payments, grouped, paidSum] = await Promise.all([
    db.payment.findMany({
      orderBy: { createdAt: "desc" },
      take: 50,
      include: { user: { select: { id: true, name: true, email: true } } },
    }),
    db.payment.groupBy({ by: ["status"], _count: { _all: true } }),
    db.payment.aggregate({ where: { status: "paid" }, _sum: { amount: true } }),
  ]);

  const counts: Record<string, number> = {};
  for (const row of grouped) counts[row.status] = row._count._all;

  return NextResponse.json({
    payments,
    stats: {
      pending: counts.pending ?? 0,
      paid: counts.paid ?? 0,
      failed: (counts.failed ?? 0) + (counts.expired ?? 0),
      revenue: paidSum._sum.amount ?? 0,
    },
    config: billingConfig(),
  });
}
