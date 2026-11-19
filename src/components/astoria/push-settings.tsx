"use client";

import { useEffect, useState } from "react";
import { BellRing, Send, Smartphone } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  currentPushSubscription,
  disablePush,
  enablePush,
  pushClientConfigured,
  pushSupported,
  sendTestPush,
} from "@/lib/push-client";

type Status = "loading" | "unsupported" | "unconfigured" | "default" | "granted" | "denied";

export function PushSettings() {
  const [status, setStatus] = useState<Status>("loading");
  const [subscribed, setSubscribed] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    async function check() {
      if (!pushSupported()) {
        if (!cancelled) setStatus("unsupported");
        return;
      }
      if (!pushClientConfigured()) {
        if (!cancelled) setStatus("unconfigured");
        return;
      }
      const permission = Notification.permission;
      const sub = await currentPushSubscription().catch(() => null);
      if (cancelled) return;
      setSubscribed(Boolean(sub));
      setStatus(permission);
    }
    void check();
    return () => {
      cancelled = true;
    };
  }, []);

  async function activate() {
    setBusy(true);
    setError(null);
    setMessage(null);
    try {
      await enablePush();
      setSubscribed(true);
      setStatus(Notification.permission);
      setMessage("Notifikasi perangkat aktif.");
    } catch (e) {
      setError(e instanceof Error ? e.message : "Gagal mengaktifkan notifikasi.");
      setStatus(Notification.permission);
    } finally {
      setBusy(false);
    }
  }

  async function deactivate() {
    setBusy(true);
    setError(null);
    setMessage(null);
    try {
      await disablePush();
      setSubscribed(false);
      setMessage("Notifikasi perangkat dimatikan.");
    } catch (e) {
      setError(e instanceof Error ? e.message : "Gagal mematikan notifikasi.");
    } finally {
      setBusy(false);
    }
  }

  async function test() {
    setBusy(true);
    setError(null);
    setMessage(null);
    try {
      await sendTestPush();
      setMessage("Notifikasi uji dikirim. Periksa panel notifikasi perangkat.");
    } catch (e) {
      setError(e instanceof Error ? e.message : "Gagal mengirim notifikasi uji.");
    } finally {
      setBusy(false);
    }
  }

  const statusText =
    status === "loading"
      ? "Memeriksa dukungan perangkat…"
      : status === "unsupported"
        ? "Peramban ini tidak mendukung Web Push."
        : status === "unconfigured"
          ? "Web Push belum dikonfigurasi di server."
          : status === "denied"
            ? "Izin notifikasi ditolak. Ubah izin situs di pengaturan peramban."
            : subscribed
              ? "Aktif di perangkat ini."
              : "Belum aktif di perangkat ini.";

  const canActivate = status === "default" || status === "granted";

  return (
    <div className="space-y-3 border-t pt-4">
      <div className="flex items-start gap-3">
        <span className="mt-0.5 rounded-lg bg-primary/10 p-2 text-primary">
          <Smartphone className="h-4 w-4" aria-hidden="true" />
        </span>
        <div className="min-w-0">
          <p className="text-sm font-medium">Notifikasi di perangkat</p>
          <p className="mt-0.5 text-xs text-muted-foreground">
            Tampilkan pemberitahuan di panel notifikasi HP, misalnya tenggat tugas dan undangan tim.
          </p>
          <p className="mt-1 text-xs font-medium text-muted-foreground" role="status">
            {statusText}
          </p>
        </div>
      </div>

      {canActivate && (
        <div className="flex flex-wrap gap-2">
          {!subscribed ? (
            <Button type="button" size="sm" onClick={activate} disabled={busy}>
              <BellRing className="mr-1.5 h-4 w-4" aria-hidden="true" />
              {busy ? "Mengaktifkan…" : "Aktifkan notifikasi"}
            </Button>
          ) : (
            <>
              <Button type="button" size="sm" variant="outline" onClick={test} disabled={busy}>
                <Send className="mr-1.5 h-4 w-4" aria-hidden="true" />
                Kirim notifikasi uji
              </Button>
              <Button type="button" size="sm" variant="ghost" onClick={deactivate} disabled={busy}>
                Matikan
              </Button>
            </>
          )}
        </div>
      )}

      {error && (
        <p role="alert" className="text-xs text-destructive">
          {error}
        </p>
      )}
      {message && (
        <p role="status" className="text-xs text-emerald-700 dark:text-emerald-400">
          {message}
        </p>
      )}
    </div>
  );
}
