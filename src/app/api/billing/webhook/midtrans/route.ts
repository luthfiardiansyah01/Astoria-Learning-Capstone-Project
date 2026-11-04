// POST /api/billing/webhook/midtrans — notifikasi transaksi Midtrans.
// Verifikasi signature SHA512 lalu aktifkan Premium (idempoten).
import { NextRequest, NextResponse } from "next/server";
import {
  midtransStatus,
  updatePaymentStatus,
  verifyMidtransSignature,
} from "@/lib/billing";

export const dynamic = "force-dynamic";

// Health check untuk dashboard/uptime monitor. Tidak mengubah data.
export async function GET() {
  return NextResponse.json({ ok: true, service: "midtrans-webhook" });
}

interface MidtransPayload {
  order_id?: string;
  status_code?: string;
  gross_amount?: string;
  signature_key?: string;
  transaction_status?: string;
  fraud_status?: string;
  transaction_id?: string;
  payment_type?: string;
}

export async function POST(req: NextRequest) {
  const raw = await req.text();

  let payload: MidtransPayload;
  try {
    payload = JSON.parse(raw) as MidtransPayload;
  } catch {
    return NextResponse.json({ error: "Payload bukan JSON valid." }, { status: 400 });
  }

  if (!verifyMidtransSignature(payload)) {
    console.warn("[midtrans] signature tidak valid", {
      order_id: payload.order_id,
      status_code: payload.status_code,
    });
    return NextResponse.json({ error: "Signature tidak valid." }, { status: 401 });
  }
  if (!payload.order_id) {
    return NextResponse.json({ error: "order_id wajib ada." }, { status: 400 });
  }

  const status = midtransStatus(payload);
  const result = await updatePaymentStatus({
    orderId: payload.order_id,
    status,
    providerRef: payload.transaction_id ?? null,
    rawPayload: payload,
    amount: payload.gross_amount ? Number(payload.gross_amount) : undefined,
  });

  if ("ok" in result && !result.ok) {
    // Notifikasi uji/stale dengan order_id yang tidak ada tetap dijawab 200
    // agar Midtrans tidak melakukan retry, tetapi tidak ada perubahan data.
    if (result.reason === "not_found") {
      return NextResponse.json({ received: true, ignored: "unknown_order" });
    }
    return NextResponse.json({ error: result.reason }, { status: 400 });
  }

  return NextResponse.json({ received: true, status });
}
