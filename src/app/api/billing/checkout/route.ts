// POST /api/billing/checkout — buat transaksi Premium di Midtrans/Xendit.
// Bila kredensial belum diisi, mengembalikan 503 + code "billing_not_configured".
import { NextResponse } from "next/server";
import type { Prisma } from "@prisma/client";
import { db } from "@/lib/db";
import { requireUser } from "@/lib/current-user";
import { effectivePlan } from "@/lib/plans";
import {
  BillingNotConfiguredError,
  PREMIUM_DURATION_DAYS,
  PREMIUM_PRICE_IDR,
  billingConfig,
  billingProvider,
  createCheckout,
  newOrderId,
} from "@/lib/billing";

export const dynamic = "force-dynamic";

export async function POST() {
  const auth = await requireUser();
  if (auth.res) return auth.res;
  const user = auth.user;

  if (user.role === "admin") {
    return NextResponse.json(
      { error: "Akun admin otomatis Premium, tidak perlu berlangganan." },
      { status: 400 }
    );
  }

  const provider = billingProvider();
  if (provider === "none") {
    const config = billingConfig();
    return NextResponse.json(
      {
        error:
          "Pembayaran otomatis belum dikonfigurasi. Admin dapat mengaktifkan Premium secara manual dari panel admin.",
        code: "billing_not_configured",
        config,
      },
      { status: 503 }
    );
  }

  const orderId = newOrderId();
  const amount = PREMIUM_PRICE_IDR;

  const payment = await db.payment.create({
    data: {
      userId: user.id,
      provider,
      orderId,
      amount,
      durationDays: PREMIUM_DURATION_DAYS,
      status: "pending",
    },
  });

  try {
    const checkout = await createCheckout({
      orderId,
      amount,
      userName: user.name,
      userEmail: user.email,
    });

    await db.payment.update({
      where: { id: payment.id },
      data: {
        providerRef: checkout.providerRef,
        checkoutUrl: checkout.checkoutUrl,
        rawPayload: checkout.raw as Prisma.InputJsonValue,
      },
    });

    return NextResponse.json({
      orderId,
      provider,
      checkoutUrl: checkout.checkoutUrl,
      amount,
      durationDays: PREMIUM_DURATION_DAYS,
    });
  } catch (e) {
    if (e instanceof BillingNotConfiguredError) {
      await db.payment.delete({ where: { id: payment.id } }).catch(() => null);
      return NextResponse.json(
        { error: e.message, code: e.code, config: billingConfig() },
        { status: 503 }
      );
    }

    const message = e instanceof Error ? e.message : "Gagal membuat transaksi.";
    await db.payment
      .update({
        where: { id: payment.id },
        data: { status: "failed", rawPayload: { error: message } },
      })
      .catch(() => null);

    console.error("[/api/billing/checkout]", e);
    return NextResponse.json({ error: message }, { status: 502 });
  }
}

// GET /api/billing/checkout — alias status paket + harga (memudahkan klien).
export async function GET() {
  const auth = await requireUser();
  if (auth.res) return auth.res;

  return NextResponse.json({
    plan: effectivePlan(auth.user),
    config: billingConfig(),
  });
}
