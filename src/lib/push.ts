import { sendNotification, setVapidDetails } from "web-push";
import { db } from "./db";
import { logger } from "./logger";

export interface PushPayload {
  title: string;
  body?: string;
  url?: string;
  tag?: string;
}

let configured: boolean | null = null;

export function pushConfigured() {
  if (configured !== null) return configured;
  const publicKey = process.env.VAPID_PUBLIC_KEY?.trim();
  const privateKey = process.env.VAPID_PRIVATE_KEY?.trim();
  const subject = process.env.VAPID_SUBJECT?.trim() || "mailto:admin1@moedatrace.com";
  if (!publicKey || !privateKey) {
    configured = false;
    return configured;
  }
  try {
    setVapidDetails(subject, publicKey, privateKey);
    configured = true;
  } catch (e) {
    logger.error("[push] kunci VAPID tidak valid", { error: e });
    configured = false;
  }
  return configured;
}

/** Kirim notifikasi ke semua perangkat pengguna. Langganan kedaluwarsa dihapus. */
export async function sendPushToUser(userId: string, payload: PushPayload) {
  if (!pushConfigured()) return { sent: 0, skipped: true as const };

  const subscriptions = await db.pushSubscription.findMany({ where: { userId } });
  let sent = 0;
  for (const sub of subscriptions) {
    try {
      await sendNotification(
        { endpoint: sub.endpoint, keys: { p256dh: sub.p256dh, auth: sub.auth } },
        JSON.stringify(payload),
        { TTL: 60 * 60 }
      );
      sent += 1;
    } catch (e) {
      const status = (e as { statusCode?: number }).statusCode;
      if (status === 404 || status === 410) {
        await db.pushSubscription.deleteMany({ where: { endpoint: sub.endpoint } });
      } else {
        logger.warn("[push] gagal mengirim", {
          status,
          error: e instanceof Error ? e.message : e,
        });
      }
    }
  }
  return { sent, skipped: false as const };
}
