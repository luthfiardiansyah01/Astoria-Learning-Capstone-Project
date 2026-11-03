// POST /api/billing/webhook/midtrans — notifikasi transaksi Midtrans.
// Verifikasi signature SHA512 lalu aktifkan Premium (idempoten).
import { NextRequest, NextResponse } from "next/server";
import {
  midtransStatus,
  updatePaymentStatus,
  verifyMidtransSignature,
} from "@/lib/billing";

export const dynamic = "force-dynamic";

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
    const code = result.reason === "not_found" ? 404 : 400;
    return NextResponse.json({ error: result.reason }, { status: code });
  }

  return NextResponse.json({ received: true, status });
}
