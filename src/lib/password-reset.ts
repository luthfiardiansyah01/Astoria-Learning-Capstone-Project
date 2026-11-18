// Token reset password: hash SHA-256, berlaku 1 jam, sekali pakai.
import crypto from "crypto";
import bcrypt from "bcryptjs";
import { db } from "./db";
import { appUrl } from "./app-url";

const TOKEN_TTL_MS = 60 * 60 * 1000;

export function hashPasswordResetToken(token: string) {
  return crypto.createHash("sha256").update(token).digest("hex");
}

export async function createPasswordResetToken(userId: string) {
  // Hanya tautan terbaru yang berlaku.
  await db.passwordResetToken.updateMany({
    where: { userId, usedAt: null },
    data: { usedAt: new Date() },
  });

  const token = crypto.randomBytes(32).toString("base64url");
  const expiresAt = new Date(Date.now() + TOKEN_TTL_MS);
  await db.passwordResetToken.create({
    data: { userId, tokenHash: hashPasswordResetToken(token), expiresAt },
  });
  return { token, expiresAt };
}

export function passwordResetUrl(token: string) {
  return `${appUrl()}/reset-password?token=${encodeURIComponent(token)}`;
}

export function passwordResetEmail(name: string, url: string) {
  const subject = "Reset password SOBAT ADI";
  const text = `Halo ${name},\n\nKami menerima permintaan reset password. Buka tautan ini (berlaku 1 jam):\n${url}\n\nJika kamu tidak meminta reset, abaikan email ini; password lama tetap berlaku.`;
  const html = `
    <div style="font-family:Arial,sans-serif;line-height:1.6;color:#111">
      <h2>Reset password SOBAT ADI</h2>
      <p>Halo <strong>${escapeHtml(name)}</strong>,</p>
      <p>Kami menerima permintaan untuk mengatur ulang password akunmu.</p>
      <p><a href="${escapeHtml(url)}" style="display:inline-block;background:#059669;color:#fff;padding:10px 18px;border-radius:8px;text-decoration:none">Atur Password Baru</a></p>
      <p style="font-size:12px;color:#555">Tautan berlaku 1 jam dan hanya bisa dipakai sekali. Jika kamu tidak meminta reset, abaikan email ini.</p>
      <p style="font-size:12px;color:#555">${escapeHtml(url)}</p>
    </div>`;
  return { subject, text, html };
}

export type ResetResult =
  | { ok: true; userId: string }
  | { ok: false; reason: "invalid" | "expired" | "used" };

/** Klaim token dan perbarui password dalam satu transaksi. */
export async function consumePasswordResetToken(
  rawToken: string,
  newPassword: string
): Promise<ResetResult> {
  const tokenHash = hashPasswordResetToken(rawToken);
  const passwordHash = await bcrypt.hash(newPassword, 12);

  return db.$transaction(async (tx) => {
    const row = await tx.passwordResetToken.findUnique({ where: { tokenHash } });
    if (!row) return { ok: false as const, reason: "invalid" as const };
    if (row.usedAt) return { ok: false as const, reason: "used" as const };
    if (row.expiresAt.getTime() <= Date.now()) {
      return { ok: false as const, reason: "expired" as const };
    }

    const claimed = await tx.passwordResetToken.updateMany({
      where: { id: row.id, usedAt: null },
      data: { usedAt: new Date() },
    });
    if (claimed.count === 0) return { ok: false as const, reason: "used" as const };

    await tx.user.update({
      where: { id: row.userId },
      data: { passwordHash },
    });

    // Token reset lain milik pengguna ini tidak diperlukan lagi.
    await tx.passwordResetToken.updateMany({
      where: { userId: row.userId, usedAt: null },
      data: { usedAt: new Date() },
    });

    return { ok: true as const, userId: row.userId };
  });
}

function escapeHtml(value: string) {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}
