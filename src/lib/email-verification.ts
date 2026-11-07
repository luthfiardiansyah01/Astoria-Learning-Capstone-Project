// Token verifikasi email: dibuat saat registrasi, disimpan sebagai hash,
// berlaku 24 jam, dan hanya bisa dipakai sekali.
import crypto from "crypto";
import { db } from "./db";
import { appUrl } from "./app-url";
import { TRIAL_MS } from "./plans";

const TOKEN_TTL_MS = 24 * 60 * 60 * 1000;

export function hashVerificationToken(token: string) {
  return crypto.createHash("sha256").update(token).digest("hex");
}

export async function createVerificationToken(userId: string) {
  // Batalkan token lama agar hanya link terbaru yang berlaku.
  await db.emailVerificationToken.updateMany({
    where: { userId, usedAt: null },
    data: { usedAt: new Date() },
  });

  const token = crypto.randomBytes(32).toString("base64url");
  const expiresAt = new Date(Date.now() + TOKEN_TTL_MS);
  await db.emailVerificationToken.create({
    data: { userId, tokenHash: hashVerificationToken(token), expiresAt },
  });
  return { token, expiresAt };
}

export function verificationUrl(token: string) {
  return `${appUrl()}/verify-email?token=${encodeURIComponent(token)}`;
}

export function verificationEmail(name: string, url: string) {
  const subject = "Verifikasi email SOBAT ADI";
  const text = `Halo ${name},\n\nVerifikasi email kamu dengan membuka tautan ini (berlaku 24 jam):\n${url}\n\nJika kamu tidak mendaftar, abaikan email ini.`;
  const html = `
    <div style="font-family:Arial,sans-serif;line-height:1.6;color:#111">
      <h2>Verifikasi email SOBAT ADI</h2>
      <p>Halo <strong>${escapeHtml(name)}</strong>,</p>
      <p>Klik tombol di bawah untuk memverifikasi email dan mengaktifkan trial Premium 7 hari.</p>
      <p><a href="${escapeHtml(url)}" style="display:inline-block;background:#059669;color:#fff;padding:10px 18px;border-radius:8px;text-decoration:none">Verifikasi Email</a></p>
      <p style="font-size:12px;color:#555">Tautan berlaku 24 jam. Jika kamu tidak mendaftar, abaikan email ini.</p>
      <p style="font-size:12px;color:#555">${escapeHtml(url)}</p>
    </div>`;
  return { subject, text, html };
}

function escapeHtml(value: string) {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

export async function verifyEmailToken(rawToken: string) {
  const tokenHash = hashVerificationToken(rawToken);

  return db.$transaction(async (tx) => {
    const row = await tx.emailVerificationToken.findUnique({
      where: { tokenHash },
      include: { user: true },
    });
    if (!row || row.usedAt || row.expiresAt.getTime() <= Date.now()) {
      return { ok: false as const, reason: "invalid" as const };
    }

    const claimed = await tx.emailVerificationToken.updateMany({
      where: { id: row.id, usedAt: null },
      data: { usedAt: new Date() },
    });
    if (claimed.count === 0) return { ok: false as const, reason: "invalid" as const };

    const user = row.user;
    const grantTrial =
      user.role !== "admin" && user.plan === "free" && !user.trialUsedAt;
    const now = new Date();

    const updated = await tx.user.update({
      where: { id: user.id },
      data: {
        emailVerifiedAt: now,
        ...(grantTrial
          ? {
              plan: "premium",
              planExpiresAt: new Date(now.getTime() + TRIAL_MS),
              trialUsedAt: now,
            }
          : {}),
      },
    });

    // Token lain milik pengguna ini tidak diperlukan lagi.
    await tx.emailVerificationToken.updateMany({
      where: { userId: user.id, usedAt: null },
      data: { usedAt: now },
    });

    return { ok: true as const, user: updated, trialGranted: grantTrial };
  });
}
