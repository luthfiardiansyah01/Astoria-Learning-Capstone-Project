// Melaporkan status konfigurasi pembayaran tanpa mencetak kredensial.
// Jalankan: bun scripts/billing-status.ts
//
// Berguna untuk memastikan apakah environment yang aktif memakai sandbox
// (uang nyata tidak diproses) atau production.

function flag(value: string | undefined) {
  if (value === undefined) return false;
  return ["1", "true", "yes", "on"].includes(value.trim().toLowerCase());
}

function positiveInt(value: string | undefined, fallback: number) {
  if (value === undefined || value.trim() === "") return fallback;
  const n = Number(value);
  return Number.isFinite(n) && n > 0 ? Math.trunc(n) : fallback;
}

const midtransKey = process.env.MIDTRANS_SERVER_KEY?.trim() ?? "";
const xenditKey = process.env.XENDIT_SECRET_KEY?.trim() ?? "";
const explicit = (process.env.PAYMENT_PROVIDER ?? "").trim().toLowerCase();

let provider: "midtrans" | "xendit" | "none" = "none";
if (explicit === "midtrans" && midtransKey) provider = "midtrans";
else if (explicit === "xendit" && xenditKey) provider = "xendit";
else if (midtransKey) provider = "midtrans";
else if (xenditKey) provider = "xendit";

const midtransProduction = flag(process.env.MIDTRANS_IS_PRODUCTION);
const sandbox =
  provider === "midtrans"
    ? !midtransProduction
    : provider === "xendit"
      ? xenditKey.startsWith("xnd_development_")
      : false;

const base = (process.env.NEXT_PUBLIC_APP_URL || process.env.NEXTAUTH_URL || "http://localhost:3000").replace(/\/$/, "");

console.log(
  JSON.stringify(
    {
      provider,
      configured: provider !== "none",
      mode: provider === "none" ? "nonaktif" : sandbox ? "sandbox" : "production",
      price: positiveInt(process.env.PAYMENT_PREMIUM_PRICE_IDR, 19_000),
      durationDays: positiveInt(process.env.PAYMENT_PREMIUM_DAYS, 30),
      midtransKeyPrefix: midtransKey ? midtransKey.slice(0, 13) + "..." : null,
      webhook: `${base}/api/billing/webhook/${provider === "xendit" ? "xendit" : "midtrans"}`,
      warnings: [
        ...(provider === "midtrans" && sandbox && midtransKey && !midtransKey.startsWith("SB-")
          ? ["Kunci Midtrans tidak berawalan SB- padahal mode sandbox."]
          : []),
        ...(provider === "midtrans" && !sandbox && midtransKey.startsWith("SB-")
          ? ["Kunci sandbox (SB-) dipakai dengan MIDTRANS_IS_PRODUCTION=true."]
          : []),
        ...(provider === "none" ? ["Tidak ada kredensial; checkout otomatis nonaktif."] : []),
      ],
    },
    null,
    2
  )
);
