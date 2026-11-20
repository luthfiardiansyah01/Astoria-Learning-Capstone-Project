// Kebijakan umur sesi. Dipisah dari auth.ts agar mudah diuji tanpa memuat NextAuth.

export const SESSION_DEFAULT_HOURS = 12;
export const SESSION_MAX_HOURS = 24 * 7;

/**
 * Umur sesi absolut dalam detik. Default 12 jam, dibatasi 1 jam sampai 7 hari.
 * Nilai env yang kosong atau tidak valid memakai default.
 */
export function sessionMaxAgeSeconds(value = process.env.SESSION_MAX_HOURS): number {
  const hours = Number(value);
  const safeHours = Number.isFinite(hours) && hours > 0 ? Math.min(hours, SESSION_MAX_HOURS) : SESSION_DEFAULT_HOURS;
  return Math.round(Math.max(1, safeHours) * 60 * 60);
}
