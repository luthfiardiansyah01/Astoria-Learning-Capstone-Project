"use client";

import { useEffect, useState } from "react";
import { signOut } from "next-auth/react";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";

type Revoked = {
  activeDevice?: string | null;
  activeSince?: string | null;
};

/**
 * Memeriksa apakah sesi ini masih menjadi sesi aktif akun.
 * Jika pengguna login di perangkat lain, sesi lama diakhiri dan peringatan muncul.
 */
export function SessionGuard() {
  const [revoked, setRevoked] = useState<Revoked | null>(null);

  useEffect(() => {
    let stopped = false;

    async function check() {
      try {
        const res = await fetch("/api/session/status", { cache: "no-store" });
        if (!res.ok) return;
        const data = (await res.json()) as {
          authenticated?: boolean;
          valid?: boolean;
          activeDevice?: string | null;
          activeSince?: string | null;
        };
        if (stopped) return;
        if (data.authenticated && data.valid === false) {
          setRevoked({
            activeDevice: data.activeDevice ?? null,
            activeSince: data.activeSince ?? null,
          });
        }
      } catch {
        // Abaikan gangguan jaringan; pemeriksaan berikutnya akan mencoba lagi.
      }
    }

    void check();
    const interval = window.setInterval(check, 30_000);
    const onFocus = () => void check();
    const onVisible = () => {
      if (document.visibilityState === "visible") void check();
    };
    const onCustom = () => void check();

    window.addEventListener("focus", onFocus);
    document.addEventListener("visibilitychange", onVisible);
    window.addEventListener("sobat:session-check", onCustom);

    return () => {
      stopped = true;
      window.clearInterval(interval);
      window.removeEventListener("focus", onFocus);
      document.removeEventListener("visibilitychange", onVisible);
      window.removeEventListener("sobat:session-check", onCustom);
    };
  }, []);

  return (
    <AlertDialog open={Boolean(revoked)} onOpenChange={() => undefined}>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>Akun ini aktif di perangkat lain</AlertDialogTitle>
          <AlertDialogDescription>
            Demi keamanan, satu akun hanya dapat digunakan pada satu perangkat. Sesi di perangkat
            ini telah diakhiri karena akun yang sama baru saja masuk di perangkat lain.
            {revoked?.activeDevice ? ` Perangkat yang aktif: ${revoked.activeDevice}.` : ""}
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogAction
            onClick={() => signOut({ callbackUrl: "/login?reason=sesi-berakhir" })}
          >
            Masuk lagi
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
