// URL publik aplikasi. Dipakai untuk link email dan callback pembayaran.
export function appUrl() {
  // Di Vercel, VERCEL_PROJECT_PRODUCTION_URL selalu berisi domain produksi.
  const vercelDomain =
    process.env.VERCEL_PROJECT_PRODUCTION_URL || process.env.VERCEL_URL || "";
  const base =
    process.env.NEXT_PUBLIC_APP_URL ||
    (vercelDomain ? `https://${vercelDomain}` : "") ||
    process.env.NEXTAUTH_URL ||
    "http://localhost:3000";
  return base.replace(/\/$/, "");
}
