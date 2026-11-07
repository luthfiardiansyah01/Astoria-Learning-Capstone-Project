// Batas ukuran body request. Middleware memakai header Content-Length agar
// request raksasa ditolak sebelum masuk ke route handler.
export const BODY_LIMIT_DEFAULT = 1 * 1024 * 1024; // 1 MB
export const BODY_LIMIT_WEBHOOK = 256 * 1024; // 256 KB

export function bodyLimitForPath(pathname: string) {
  return pathname.startsWith("/api/billing/webhook/")
    ? BODY_LIMIT_WEBHOOK
    : BODY_LIMIT_DEFAULT;
}

/** True bila Content-Length valid dan melebihi batas untuk path tersebut. */
export function exceedsBodyLimit(pathname: string, contentLength: string | null) {
  if (!contentLength) return false;
  const length = Number(contentLength);
  if (!Number.isFinite(length) || length < 0) return false;
  return length > bodyLimitForPath(pathname);
}
