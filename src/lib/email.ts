// Pengiriman email transaksional melalui Resend HTTP API.
// Bila RESEND_API_KEY/EMAIL_FROM belum diisi, mode development hanya mencatat
// peringatan; mode production mengembalikan error agar registrasi tidak membuat
// akun yang tidak bisa diverifikasi.
import { logger } from "./logger";

export interface SendEmailInput {
  to: string;
  subject: string;
  html: string;
  text?: string;
}

export function emailConfigured() {
  return Boolean(process.env.RESEND_API_KEY?.trim() && process.env.EMAIL_FROM?.trim());
}

export async function sendEmail(input: SendEmailInput): Promise<{ ok: boolean; skipped?: boolean; error?: string }> {
  const apiKey = process.env.RESEND_API_KEY?.trim();
  const from = process.env.EMAIL_FROM?.trim();

  if (!apiKey || !from) {
    if (process.env.NODE_ENV !== "production") {
      logger.warn("[email] RESEND_API_KEY/EMAIL_FROM kosong; email tidak dikirim (mode development).", {
        to: input.to,
        subject: input.subject,
      });
      return { ok: true, skipped: true };
    }
    logger.error("[email] RESEND_API_KEY/EMAIL_FROM belum dikonfigurasi di production.");
    return { ok: false, error: "Email belum dikonfigurasi." };
  }

  try {
    const res = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${apiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        from,
        to: [input.to],
        subject: input.subject,
        html: input.html,
        ...(input.text ? { text: input.text } : {}),
      }),
    });

    if (!res.ok) {
      const detail = (await res.text().catch(() => "")).slice(0, 300);
      logger.error("[email] Resend menolak pengiriman:", { status: res.status, detail });
      return { ok: false, error: `Resend ${res.status}` };
    }
    return { ok: true };
  } catch (e) {
    logger.error("[email] gagal menghubungi Resend:", { error: e instanceof Error ? e.message : e });
    return { ok: false, error: "Gagal mengirim email." };
  }
}
