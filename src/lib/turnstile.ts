// Verifikasi Cloudflare Turnstile. Bila kedua kunci belum diisi, CAPTCHA
// dilewati (mis. development/test) dan registrasi tetap berjalan.
export function turnstileConfigured() {
  return Boolean(
    process.env.TURNSTILE_SECRET_KEY?.trim() &&
      process.env.NEXT_PUBLIC_TURNSTILE_SITE_KEY?.trim()
  );
}

export async function verifyTurnstile(
  token: string | undefined,
  ip: string
): Promise<{ ok: boolean; error?: string }> {
  if (!turnstileConfigured()) return { ok: true };
  if (!token?.trim()) return { ok: false, error: "CAPTCHA wajib diselesaikan." };

  try {
    const body = new URLSearchParams({
      secret: process.env.TURNSTILE_SECRET_KEY!.trim(),
      response: token.trim(),
      remoteip: ip,
    });
    const res = await fetch("https://challenges.cloudflare.com/turnstile/v0/siteverify", {
      method: "POST",
      body,
      cache: "no-store",
    });
    const data = (await res.json().catch(() => ({}))) as { success?: boolean };
    return data.success ? { ok: true } : { ok: false, error: "CAPTCHA tidak valid. Coba lagi." };
  } catch {
    return { ok: false, error: "Gagal memverifikasi CAPTCHA. Coba lagi." };
  }
}
