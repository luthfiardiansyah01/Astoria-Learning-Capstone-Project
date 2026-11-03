// GET /api/billing/config — status konfigurasi payment gateway (tanpa kredensial).
import { NextResponse } from "next/server";
import { requireUser } from "@/lib/current-user";
import { billingConfig } from "@/lib/billing";

export const dynamic = "force-dynamic";

export async function GET() {
  const auth = await requireUser();
  if (auth.res) return auth.res;

  return NextResponse.json(billingConfig());
}
