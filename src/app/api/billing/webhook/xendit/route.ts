// POST /api/billing/webhook/xendit — callback invoice Xendit.
// Verifikasi header x-callback-token lalu aktifkan Premium (idempoten).
import { NextRequest, NextResponse } from "next/server";
import { updatePaymentStatus, verifyXenditCallback, xenditStatus } from "@/lib/billing";

export const dynamic = "force-dynamic";

interface XenditPayload {
  external_id?: string;
  id?: string;
  status?: string;
  amount?: number;
  paid_amount?: number;
  payment_method?: string;
  paid_at?: string;
}

export async function POST(req: NextRequest) {
  if (!verifyXenditCallback(req.headers.get("x-callback-token"))) {
    return NextResponse.json({ error: "Callback token tidak valid." }, { status: 401 });
  }

  let payload: XenditPayload;
  try {
    payload = (await req.json()) as XenditPayload;
  } catch {
    return NextResponse.json({ error: "Payload bukan JSON valid." }, { status: 400 });
  }

  if (!payload.external_id) {
    // Callback selain invoice (mis. e-wallet) diabaikan dengan aman.
    return NextResponse.json({ received: true, ignored: true });
  }

  const status = xenditStatus(payload.status);

  // Nominal wajib valid untuk status lunas; jangan lewati pengecekan amount
  // hanya karena provider mengirim string/field berbeda.
  let amount: number | undefined;
  if (status === "paid") {
    const rawAmount = payload.paid_amount ?? payload.amount;
    const parsedAmount = typeof rawAmount === "number" ? rawAmount : Number(rawAmount);
    if (!Number.isFinite(parsedAmount) || parsedAmount <= 0) {
      return NextResponse.json({ error: "Nominal pembayaran tidak valid." }, { status: 400 });
    }
    amount = parsedAmount;
  }

  const result = await updatePaymentStatus({
    orderId: payload.external_id,
    status,
    providerRef: payload.id ?? null,
    rawPayload: payload,
    amount,
  });

  if ("ok" in result && !result.ok) {
    if (result.reason === "not_found") {
      return NextResponse.json({ received: true, ignored: "unknown_order" });
    }
    return NextResponse.json({ error: result.reason }, { status: 400 });
  }

  return NextResponse.json({ received: true, status });
}
