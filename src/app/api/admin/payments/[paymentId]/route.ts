// PATCH /api/admin/payments/[paymentId] — konfirmasi manual pembayaran.
// Dipakai untuk transfer manual saat payment gateway belum dikonfigurasi.
import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { requireAdmin } from "@/lib/current-user";
import { settlePayment, updatePaymentStatus } from "@/lib/billing";
import { adminPaymentUpdateSchema, readBody } from "@/lib/validation";

export const dynamic = "force-dynamic";

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ paymentId: string }> }
) {
  const auth = await requireAdmin();
  if (auth.res) return auth.res;

  const { paymentId } = await params;
  const parsed = await readBody(req, adminPaymentUpdateSchema);
  if (!parsed.ok) return NextResponse.json({ error: parsed.error }, { status: 400 });

  const payment = await db.payment.findUnique({ where: { id: paymentId } });
  if (!payment) return NextResponse.json({ error: "Pembayaran tidak ditemukan." }, { status: 404 });

  if (parsed.data.status === "paid") {
    const result = await settlePayment({
      orderId: payment.orderId,
      status: "paid",
      rawPayload: { manualConfirmation: true, confirmedBy: auth.user.id },
    });
    if ("ok" in result && !result.ok) {
      return NextResponse.json({ error: result.reason }, { status: 400 });
    }
  } else {
    await updatePaymentStatus({
      orderId: payment.orderId,
      status: parsed.data.status,
      rawPayload: { manualUpdate: true, updatedBy: auth.user.id },
    });
  }

  const updated = await db.payment.findUnique({
    where: { id: paymentId },
    include: { user: { select: { id: true, name: true, email: true } } },
  });

  return NextResponse.json({ payment: updated });
}
