// DELETE /api/billing/payments/[paymentId] — batalkan pesanan pending milik sendiri.
import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { requireUser } from "@/lib/current-user";
import { cancelProviderPayment } from "@/lib/billing";

export const dynamic = "force-dynamic";

export async function DELETE(
  _req: NextRequest,
  { params }: { params: Promise<{ paymentId: string }> }
) {
  const auth = await requireUser();
  if (auth.res) return auth.res;

  const { paymentId } = await params;
  const payment = await db.payment.findFirst({
    where: { id: paymentId, userId: auth.user.id },
  });
  if (!payment) {
    return NextResponse.json({ error: "Pesanan tidak ditemukan." }, { status: 404 });
  }

  if (payment.status === "paid") {
    return NextResponse.json(
      { error: "Pesanan sudah dibayar dan tidak bisa dibatalkan." },
      { status: 409 }
    );
  }

  if (payment.status === "cancelled" || payment.status === "expired" || payment.status === "failed") {
    return NextResponse.json({ payment, gatewayCancelled: false, warning: "Pesanan sudah tidak aktif." });
  }

  // Klaim transisi pending → cancelled secara atomik. Bila webhook settlement
  // lebih dulu mengubah status menjadi paid, update ini tidak mengenai baris apa pun
  // sehingga status lunas tidak tertimpa.
  const claim = await db.payment.updateMany({
    where: { id: payment.id, userId: auth.user.id, status: "pending" },
    data: { status: "cancelled" },
  });

  if (claim.count === 0) {
    const latest = await db.payment.findUnique({
      where: { id: payment.id },
      select: {
        id: true,
        orderId: true,
        amount: true,
        status: true,
        durationDays: true,
        createdAt: true,
      },
    });
    return NextResponse.json(
      {
        payment: latest,
        gatewayCancelled: false,
        warning: "Status pesanan sudah berubah; pembatalan tidak dilakukan.",
      },
      { status: 409 }
    );
  }

  const gateway = await cancelProviderPayment({
    provider: payment.provider,
    orderId: payment.orderId,
    providerRef: payment.providerRef,
  });

  const updated = await db.payment.update({
    where: { id: payment.id },
    data: {
      rawPayload: {
        cancelledAt: new Date().toISOString(),
        cancelledBy: auth.user.id,
        gatewayCancelled: gateway.cancelled,
        warning: gateway.warning ?? null,
      },
    },
    select: {
      id: true,
      orderId: true,
      amount: true,
      status: true,
      durationDays: true,
      createdAt: true,
    },
  });

  return NextResponse.json({
    payment: updated,
    gatewayCancelled: gateway.cancelled,
    warning: gateway.warning,
  });
}
