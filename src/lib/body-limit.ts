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

export type LimitedBody =
  | { ok: true; text: string }
  | { ok: false; tooLarge: true };

/**
 * Baca body dengan batas ukuran keras. Header Content-Length saja tidak cukup:
 * klien dapat mengirim chunked tanpa header tersebut. Fungsi ini membaca stream
 * dan berhenti begitu melewati batas, sehingga memori tidak membengkak.
 */
export async function readLimitedText(
  req: Request,
  limit = BODY_LIMIT_DEFAULT
): Promise<LimitedBody> {
  const declared = req.headers.get("content-length");
  if (declared) {
    const length = Number(declared);
    if (Number.isFinite(length) && length > limit) {
      await req.body?.cancel().catch(() => null);
      return { ok: false, tooLarge: true };
    }
  }

  if (!req.body) return { ok: true, text: "" };

  const reader = req.body.getReader();
  const chunks: Uint8Array[] = [];
  let total = 0;

  try {
    for (;;) {
      const { done, value } = await reader.read();
      if (done) break;
      if (!value) continue;
      total += value.byteLength;
      if (total > limit) {
        await reader.cancel().catch(() => null);
        return { ok: false, tooLarge: true };
      }
      chunks.push(value);
    }
  } finally {
    try {
      reader.releaseLock();
    } catch {
      // Reader sudah ditutup/dibatalkan; tidak ada yang perlu dilakukan.
    }
  }

  const merged = new Uint8Array(total);
  let offset = 0;
  for (const chunk of chunks) {
    merged.set(chunk, offset);
    offset += chunk.byteLength;
  }
  return { ok: true, text: new TextDecoder().decode(merged) };
}
