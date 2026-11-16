import { logger } from "@/lib/logger";
// POST /api/billing/checkout — buat transaksi Premium di Midtrans/Xendit.
// Bila kredensial belum diisi, mengembalikan 503 + code "billing_not_configured".
import { NextResponse } from "next/server";
import type { Prisma } from "@prisma/client";
import { db } from "@/lib/db";
import { requireUser } from "@/lib/current-user";
import { effectivePlan } from "@/lib/plans";
import { rateLimit, tooManyRequests } from "@/lib/rate-limit";
import {
  BillingNotConfiguredError,
  PREMIUM_DURATION_DAYS,
  PREMIUM_PRICE_IDR,
  billingConfig,
  billingProvider,
  createCheckout,
  manualOnly,
  manualTransferInfo,
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
  const manual = manualOnly();
  if (!manual && provider === "none") {
    return NextResponse.json(
      {
        error:
          "Pembayaran otomatis belum tersedia. Admin dapat mengaktifkan Premium secara manual.",
        code: "billing_not_configured",
      },
      { status: 503 }
    );
  }

  const orderId = newOrderId();
  const amount = PREMIUM_PRICE_IDR;

  // Cegah spam invoice: maksimal 5 percobaan checkout per jam.
  const limited = await rateLimit("billing-checkout", user.id, 5, 3600, { failClosed: true });
  if (!limited.ok) return tooManyRequests(limited);

  // Bersihkan transaksi pending yang sudah melewati masa berlaku, lalu pakai
  // ulang pesanan yang masih aktif agar klik ganda tidak membuat tagihan baru
  // (invoice Midtrans/Xendit dan instruksi transfer berlaku 24 jam).
  const now = new Date();
  const invoiceTtlMs = 24 * 60 * 60 * 1000;
  const staleBefore = new Date(now.getTime() - invoiceTtlMs);
  await db.payment.updateMany({
    where: {
      userId: user.id,
      status: "pending",
      createdAt: { lt: staleBefore },
      ...(manual ? { provider: "manual" } : {}),
    },
    data: { status: "expired" },
  });

  const existing = await db.payment.findFirst({
    where: {
      userId: user.id,
      status: "pending",
      createdAt: { gte: staleBefore },
      ...(manual ? { provider: "manual" } : { provider, checkoutUrl: { not: null } }),
    },
    orderBy: { createdAt: "desc" },
  });

  if (existing) {
    return NextResponse.json({
      orderId: existing.orderId,
      provider: existing.provider,
      manual,
      checkoutUrl: existing.checkoutUrl ?? undefined,
      amount: existing.amount,
      durationDays: existing.durationDays,
      instructions: manual ? manualTransferInfo() : undefined,
      reused: true,
    });
  }

  const payment = await db.payment.create({
    data: {
      userId: user.id,
      provider: manual ? "manual" : provider,
      orderId,
      amount,
      durationDays: PREMIUM_DURATION_DAYS,
      status: "pending",
    },
  });

  if (manual) {
    return NextResponse.json({
      orderId,
      provider: "manual",
      manual: true,
      amount,
      durationDays: PREMIUM_DURATION_DAYS,
      instructions: manualTransferInfo(),
    });
  }

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
        { error: e.message, code: e.code },
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

    logger.error("[/api/billing/checkout]", { error: e });
    return NextResponse.json({ error: message }, { status: 502 });
  }
}

// GET /api/billing/checkout — alias status paket + harga (memudahkan klien).
export async function GET() {
  const auth = await requireUser();
  if (auth.res) return auth.res;
  const { provider, configured, price, durationDays } = billingConfig();

  return NextResponse.json({
    plan: effectivePlan(auth.user),
    provider,
    configured,
    manualOnly: manualOnly(),
    manual: manualTransferInfo(),
    price,
    durationDays,
  });
}
