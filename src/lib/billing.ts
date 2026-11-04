// Integrasi pembayaran Premium (Midtrans Snap / Xendit Invoice).
// Kredensial dibaca dari environment; bila belum diisi, checkout dinonaktifkan
// dan UI menampilkan status "belum dikonfigurasi" (placeholder).
//
// Server-only: jangan diimpor dari komponen client.

import crypto from "crypto";
import type { Prisma } from "@prisma/client";
import { db } from "./db";
import { createNotification } from "./collab-notify";

export type BillingProvider = "midtrans" | "xendit" | "none";
export type PaymentStatus = "pending" | "paid" | "failed" | "expired" | "refunded" | "cancelled";

export const PREMIUM_PRICE_IDR = Number(process.env.PAYMENT_PREMIUM_PRICE_IDR ?? 19_000);
export const PREMIUM_DURATION_DAYS = Number(process.env.PAYMENT_PREMIUM_DAYS ?? 30);

const DAY_MS = 24 * 60 * 60 * 1000;

function envFlag(value: string | undefined, fallback = false) {
  if (value === undefined) return fallback;
  return ["1", "true", "yes", "on"].includes(value.trim().toLowerCase());
}

export function appUrl() {
  // Di Vercel, VERCEL_PROJECT_PRODUCTION_URL selalu berisi domain produksi.
  // NEXTAUTH_URL bisa saja masih menunjuk ke localhost pada deployment lama.
  const vercelDomain =
    process.env.VERCEL_PROJECT_PRODUCTION_URL || process.env.VERCEL_URL || "";
  const base =
    process.env.NEXT_PUBLIC_APP_URL ||
    (vercelDomain ? `https://${vercelDomain}` : "") ||
    process.env.NEXTAUTH_URL ||
    "http://localhost:3000";
  return base.replace(/\/$/, "");
}

export function midtransIsProduction() {
  return envFlag(process.env.MIDTRANS_IS_PRODUCTION);
}

/** Provider efektif: PAYMENT_PROVIDER bila kredensialnya ada, atau deteksi otomatis. */
export function billingProvider(): BillingProvider {
  const explicit = (process.env.PAYMENT_PROVIDER ?? "").trim().toLowerCase();

  if (explicit === "midtrans" && process.env.MIDTRANS_SERVER_KEY) return "midtrans";
  if (explicit === "xendit" && process.env.XENDIT_SECRET_KEY) return "xendit";

  if (process.env.MIDTRANS_SERVER_KEY) return "midtrans";
  if (process.env.XENDIT_SECRET_KEY) return "xendit";
  return "none";
}

export interface BillingConfig {
  provider: BillingProvider;
  configured: boolean;
  price: number;
  durationDays: number;
  currency: "IDR";
  /** Variabel environment yang dibutuhkan provider aktif. */
  requiredEnv: { key: string; set: boolean; hint: string }[];
  /** URL webhook yang harus didaftarkan di dashboard provider. */
  webhookUrls: { midtrans: string; xendit: string };
}

export function billingConfig(): BillingConfig {
  const provider = billingProvider();

  const midtransEnv = [
    { key: "MIDTRANS_SERVER_KEY", set: Boolean(process.env.MIDTRANS_SERVER_KEY), hint: "Server Key dari dashboard Midtrans." },
    { key: "MIDTRANS_CLIENT_KEY", set: Boolean(process.env.MIDTRANS_CLIENT_KEY), hint: "Client Key (opsional untuk redirect Snap)." },
    { key: "MIDTRANS_IS_PRODUCTION", set: Boolean(process.env.MIDTRANS_IS_PRODUCTION), hint: "true untuk produksi, kosong untuk sandbox." },
  ];
  const xenditEnv = [
    { key: "XENDIT_SECRET_KEY", set: Boolean(process.env.XENDIT_SECRET_KEY), hint: "Secret API key dari dashboard Xendit." },
    { key: "XENDIT_CALLBACK_TOKEN", set: Boolean(process.env.XENDIT_CALLBACK_TOKEN), hint: "Verification token callback Xendit." },
  ];

  return {
    provider,
    configured: provider === "midtrans" || provider === "xendit",
    price: PREMIUM_PRICE_IDR,
    durationDays: PREMIUM_DURATION_DAYS,
    currency: "IDR",
    requiredEnv:
      provider === "xendit"
        ? xenditEnv
        : provider === "midtrans"
          ? midtransEnv
          : [...midtransEnv, ...xenditEnv],
    webhookUrls: {
      midtrans: `${appUrl()}/api/billing/webhook/midtrans`,
      xendit: `${appUrl()}/api/billing/webhook/xendit`,
    },
  };
}

export function newOrderId() {
  const stamp = new Date().toISOString().replace(/[-:.TZ]/g, "").slice(0, 14);
  return `SOBAT-${stamp}-${crypto.randomBytes(4).toString("hex").toUpperCase()}`;
}

export class BillingNotConfiguredError extends Error {
  code = "billing_not_configured" as const;
  constructor(message = "Pembayaran otomatis belum dikonfigurasi. Hubungi admin untuk aktivasi manual.") {
    super(message);
  }
}

interface CheckoutInput {
  orderId: string;
  amount: number;
  userName: string;
  userEmail?: string | null;
}

interface CheckoutResult {
  provider: Exclude<BillingProvider, "none" | "manual">;
  checkoutUrl: string;
  providerRef: string;
  raw: unknown;
}

/** Buat transaksi di provider aktif. Melempar BillingNotConfiguredError bila belum disetel. */
export async function createCheckout(input: CheckoutInput): Promise<CheckoutResult> {
  const provider = billingProvider();
  if (provider === "midtrans") return createMidtransCheckout(input);
  if (provider === "xendit") return createXenditCheckout(input);
  throw new BillingNotConfiguredError();
}

async function createMidtransCheckout(input: CheckoutInput): Promise<CheckoutResult> {
  const serverKey = process.env.MIDTRANS_SERVER_KEY;
  if (!serverKey) throw new BillingNotConfiguredError();

  const base = midtransIsProduction()
    ? "https://app.midtrans.com"
    : "https://app.sandbox.midtrans.com";
  const endpoint = `${process.env.MIDTRANS_SNAP_URL?.replace(/\/$/, "") || base}/snap/v1/transactions`;

  const res = await fetch(endpoint, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Accept: "application/json",
      Authorization: `Basic ${Buffer.from(`${serverKey}:`).toString("base64")}`,
    },
    body: JSON.stringify({
      transaction_details: { order_id: input.orderId, gross_amount: input.amount },
      item_details: [
        {
          id: `premium-${PREMIUM_DURATION_DAYS}d`,
          price: input.amount,
          quantity: 1,
          name: `SOBAT ADI Premium ${PREMIUM_DURATION_DAYS} hari`,
        },
      ],
      customer_details: {
        first_name: input.userName.slice(0, 50),
        ...(input.userEmail ? { email: input.userEmail } : {}),
      },
      callbacks: { finish: `${appUrl()}/?billing=finish` },
      expiry: { unit: "hours", duration: 24 },
    }),
  });

  const body = (await res.json().catch(() => ({}))) as {
    token?: string;
    redirect_url?: string;
    error_messages?: string[];
  };

  if (!res.ok || !body.redirect_url) {
    throw new Error(
      `Midtrans menolak transaksi (${res.status}): ${body.error_messages?.join("; ") ?? "respons tidak valid"}.`
    );
  }

  return {
    provider: "midtrans",
    checkoutUrl: body.redirect_url,
    providerRef: body.token ?? "",
    raw: body,
  };
}

async function createXenditCheckout(input: CheckoutInput): Promise<CheckoutResult> {
  const secretKey = process.env.XENDIT_SECRET_KEY;
  if (!secretKey) throw new BillingNotConfiguredError();

  const endpoint = `${process.env.XENDIT_INVOICE_URL?.replace(/\/$/, "") || "https://api.xendit.co"}/v2/invoices`;

  const res = await fetch(endpoint, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Accept: "application/json",
      Authorization: `Basic ${Buffer.from(`${secretKey}:`).toString("base64")}`,
    },
    body: JSON.stringify({
      external_id: input.orderId,
      amount: input.amount,
      currency: "IDR",
      description: `SOBAT ADI Premium ${PREMIUM_DURATION_DAYS} hari`,
      invoice_duration: 86_400,
      customer: {
        given_names: input.userName.slice(0, 50),
        ...(input.userEmail ? { email: input.userEmail } : {}),
      },
      items: [
        {
          name: `Premium ${PREMIUM_DURATION_DAYS} hari`,
          quantity: 1,
          price: input.amount,
          category: "Langganan",
        },
      ],
      success_redirect_url: `${appUrl()}/?billing=finish`,
      failure_redirect_url: `${appUrl()}/?billing=failed`,
    }),
  });

  const body = (await res.json().catch(() => ({}))) as {
    id?: string;
    invoice_url?: string;
    message?: string;
    error_code?: string;
  };

  if (!res.ok || !body.invoice_url) {
    throw new Error(
      `Xendit menolak transaksi (${res.status}): ${body.message ?? body.error_code ?? "respons tidak valid"}.`
    );
  }

  return {
    provider: "xendit",
    checkoutUrl: body.invoice_url,
    providerRef: body.id ?? "",
    raw: body,
  };
}

/* ── Verifikasi webhook ── */

/** Midtrans: SHA512(order_id + status_code + gross_amount + server_key). */
export function verifyMidtransSignature(payload: {
  order_id?: string;
  status_code?: string;
  gross_amount?: string;
  signature_key?: string;
}) {
  const serverKey = process.env.MIDTRANS_SERVER_KEY;
  if (!serverKey) return false;
  if (!payload.order_id || !payload.status_code || !payload.gross_amount || !payload.signature_key) {
    return false;
  }

  const expected = crypto
    .createHash("sha512")
    .update(`${payload.order_id}${payload.status_code}${payload.gross_amount}${serverKey}`)
    .digest("hex");

  return timingSafeEqual(expected, payload.signature_key);
}

/** Xendit: header x-callback-token harus sama dengan XENDIT_CALLBACK_TOKEN. */
export function verifyXenditCallback(token: string | null) {
  const expected = process.env.XENDIT_CALLBACK_TOKEN;
  if (!expected || !token) return false;
  return timingSafeEqual(expected, token);
}

function timingSafeEqual(a: string, b: string) {
  const left = Buffer.from(a);
  const right = Buffer.from(b);
  if (left.length !== right.length) return false;
  return crypto.timingSafeEqual(left, right);
}

/* ── Pemetaan status provider → status internal ── */

export function midtransStatus(payload: {
  transaction_status?: string;
  fraud_status?: string;
}): PaymentStatus {
  const status = (payload.transaction_status ?? "").toLowerCase();
  if (status === "capture") {
    return (payload.fraud_status ?? "accept").toLowerCase() === "challenge" ? "pending" : "paid";
  }
  if (status === "settlement") return "paid";
  if (status === "pending") return "pending";
  if (status === "expire") return "expired";
  if (status === "refund" || status === "partial_refund") return "refunded";
  if (status === "deny" || status === "cancel" || status === "failure") return "failed";
  return "pending";
}

export function xenditStatus(status: string | undefined): PaymentStatus {
  switch ((status ?? "").toUpperCase()) {
    case "PAID":
    case "SETTLED":
      return "paid";
    case "EXPIRED":
      return "expired";
    case "FAILED":
      return "failed";
    case "REFUNDED":
      return "refunded";
    default:
      return "pending";
  }
}

/* ── Aktivasi Premium ── */

/** Perpanjang dari sisa langganan aktif, atau mulai dari sekarang. */
export function premiumExpiryFrom(base: Date | null | undefined, days = PREMIUM_DURATION_DAYS) {
  const now = Date.now();
  const start = base && base.getTime() > now ? base.getTime() : now;
  return new Date(start + days * DAY_MS);
}

/**
 * Tandai pembayaran lunas dan aktifkan/perpanjang Premium.
 * Idempoten: pemanggilan webhook berulang tidak menambah masa aktif dua kali.
 */
export async function settlePayment(input: {
  orderId: string;
  status: PaymentStatus;
  providerRef?: string | null;
  rawPayload?: unknown;
  amount?: number;
}) {
  const result = await db.$transaction(async (tx) => {
    const payment = await tx.payment.findUnique({ where: { orderId: input.orderId } });
    if (!payment) return { ok: false as const, reason: "not_found" as const };

    if (input.amount !== undefined && input.amount !== payment.amount) {
      return { ok: false as const, reason: "amount_mismatch" as const };
    }

    // Kunci idempotensi: hanya transisi pertama menuju "paid" yang mengaktifkan paket.
    const locked = await tx.payment.updateMany({
      where: { id: payment.id, status: { not: "paid" } },
      data: {
        status: "paid",
        paidAt: new Date(),
        providerRef: input.providerRef ?? payment.providerRef,
        rawPayload: jsonOrUndefined(input.rawPayload),
      },
    });

    if (locked.count === 0) {
      return { ok: true as const, alreadyPaid: true, payment };
    }

    const user = await tx.user.findUnique({ where: { id: payment.userId } });
    if (!user) return { ok: false as const, reason: "user_not_found" as const };

    const expiresAt = premiumExpiryFrom(user.planExpiresAt, payment.durationDays);
    await tx.user.update({
      where: { id: user.id },
      data: { plan: "premium", planExpiresAt: expiresAt },
    });

    const updated = await tx.payment.update({
      where: { id: payment.id },
      data: { expiresAt },
    });

    return { ok: true as const, alreadyPaid: false, payment: updated, expiresAt };
  });

  if (result.ok && !result.alreadyPaid && result.expiresAt) {
    await createNotification(result.payment.userId, {
      type: "plan_updated",
      title: "Premium aktif 🎉",
      body: `Pembayaran diterima. Premium aktif sampai ${result.expiresAt.toLocaleDateString("id-ID")}.`,
      link: "/",
    }).catch(() => null);
  }

  return result;
}

/** Catat status gagal/expired tanpa mengubah paket pengguna. */
export async function updatePaymentStatus(input: {
  orderId: string;
  status: PaymentStatus;
  rawPayload?: unknown;
  providerRef?: string | null;
  amount?: number;
}) {
  if (input.status === "paid") return settlePayment(input);
  return db.payment.updateMany({
    where: { orderId: input.orderId, status: { not: "paid" } },
    data: {
      status: input.status,
      providerRef: input.providerRef ?? undefined,
      rawPayload: jsonOrUndefined(input.rawPayload),
    },
  });
}

export interface CancelProviderResult {
  cancelled: boolean;
  warning?: string;
}

/**
 * Batalkan transaksi di provider (best effort). Pembatalan lokal tetap
 * dilakukan walaupun gateway menolak/tidak mendukung.
 */
export async function cancelProviderPayment(payment: {
  provider: string;
  orderId: string;
  providerRef?: string | null;
}): Promise<CancelProviderResult> {
  try {
    if (payment.provider === "midtrans" && process.env.MIDTRANS_SERVER_KEY) {
      const base = midtransIsProduction()
        ? "https://api.midtrans.com"
        : "https://api.sandbox.midtrans.com";
      const res = await fetch(
        `${base}/v2/${encodeURIComponent(payment.orderId)}/cancel`,
        {
          method: "POST",
          headers: {
            Accept: "application/json",
            "Content-Type": "application/json",
            Authorization: `Basic ${Buffer.from(`${process.env.MIDTRANS_SERVER_KEY}:`).toString("base64")}`,
          },
          body: "{}",
        }
      );
      if (!res.ok) {
        const detail = (await res.text().catch(() => "")).slice(0, 300);
        return { cancelled: false, warning: `Midtrans ${res.status}: ${detail || "gagal membatalkan"}` };
      }
      return { cancelled: true };
    }

    if (
      payment.provider === "xendit" &&
      process.env.XENDIT_SECRET_KEY &&
      payment.providerRef
    ) {
      const base = process.env.XENDIT_INVOICE_URL?.replace(/\/$/, "") || "https://api.xendit.co";
      const res = await fetch(`${base}/v2/invoices/${payment.providerRef}/expire`, {
        method: "POST",
        headers: {
          Accept: "application/json",
          "Content-Type": "application/json",
          Authorization: `Basic ${Buffer.from(`${process.env.XENDIT_SECRET_KEY}:`).toString("base64")}`,
        },
        body: "{}",
      });
      if (!res.ok) {
        const detail = (await res.text().catch(() => "")).slice(0, 300);
        return { cancelled: false, warning: `Xendit ${res.status}: ${detail || "gagal membatalkan"}` };
      }
      return { cancelled: true };
    }

    return { cancelled: false, warning: "Provider tidak mendukung pembatalan otomatis." };
  } catch (e) {
    return {
      cancelled: false,
      warning: e instanceof Error ? e.message : "Gagal menghubungi gateway.",
    };
  }
}

function jsonOrUndefined(value: unknown): Prisma.InputJsonValue | undefined {
  return value === undefined ? undefined : (value as Prisma.InputJsonValue);
}
