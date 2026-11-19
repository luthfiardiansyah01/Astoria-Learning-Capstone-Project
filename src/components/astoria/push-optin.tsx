"use client";

import { useEffect, useState } from "react";
import { BellRing, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  currentPushSubscription,
  enablePush,
  pushClientConfigured,
  pushSupported,
} from "@/lib/push-client";

const DISMISS_KEY = "sobat-push-optin-dismissed";

/**
 * Ajakan aktivasi notifikasi perangkat untuk semua pengguna.
 * Izin tetap harus diberikan pengguna; banner ini hanya mempermudah.
 */
export function PushOptIn() {
  const [show, setShow] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    const timer = window.setTimeout(async () => {
      if (window.localStorage.getItem(DISMISS_KEY) === "1") return;
      if (!pushSupported() || !pushClientConfigured()) return;
      if (Notification.permission === "denied") return;
      const subscription = await currentPushSubscription().catch(() => null);
      if (!cancelled && !subscription) setShow(true);
    }, 2500);

    return () => {
      cancelled = true;
      window.clearTimeout(timer);
    };
  }, []);

  function dismiss() {
    window.localStorage.setItem(DISMISS_KEY, "1");
    setShow(false);
  }

  async function activate() {
    setBusy(true);
    setError(null);
    try {
      await enablePush();
      setShow(false);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Gagal mengaktifkan notifikasi.");
    } finally {
      setBusy(false);
    }
  }

  if (!show) return null;

  return (
    <section
      data-testid="push-optin"
      aria-label="Aktifkan notifikasi perangkat"
      className="mb-4 flex flex-col gap-3 rounded-xl border border-primary/30 bg-primary/5 p-3 sm:flex-row sm:items-center sm:justify-between"
    >
      <div className="flex items-start gap-2.5">
        <span className="mt-0.5 rounded-lg bg-primary/10 p-2 text-primary">
          <BellRing className="h-4 w-4" aria-hidden="true" />
        </span>
        <div className="min-w-0">
          <p className="text-sm font-medium">Aktifkan notifikasi di perangkat</p>
          <p className="mt-0.5 text-xs text-muted-foreground">
            Dapatkan pemberitahuan tenggat tugas dan undangan tim langsung di HP.
          </p>
          {error && (
            <p role="alert" className="mt-1 text-xs text-destructive">
              {error}
            </p>
          )}
        </div>
      </div>
      <div className="flex shrink-0 items-center gap-2">
        <Button type="button" size="sm" onClick={activate} disabled={busy}>
          {busy ? "Mengaktifkan…" : "Aktifkan"}
        </Button>
        <Button type="button" size="sm" variant="ghost" onClick={dismiss} aria-label="Nanti saja">
          <X className="h-4 w-4" aria-hidden="true" />
          Nanti
        </Button>
      </div>
    </section>
  );
}
