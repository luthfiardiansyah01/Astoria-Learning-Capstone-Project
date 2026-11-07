"use client";

import { Suspense, useEffect, useState } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { CheckCircle2, Loader2, XCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

function VerifyInner() {
  const params = useSearchParams();
  const token = params.get("token");
  const [state, setState] = useState<"loading" | "success" | "error">("loading");
  const [message, setMessage] = useState("Memverifikasi email...");

  useEffect(() => {
    if (!token) {
      setState("error");
      setMessage("Tautan verifikasi tidak lengkap.");
      return;
    }
    let cancelled = false;
    (async () => {
      try {
        const res = await fetch("/api/auth/verify-email", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ token }),
        });
        const body = await res.json().catch(() => ({}));
        if (cancelled) return;
        if (!res.ok) {
          setState("error");
          setMessage(body.error || "Verifikasi gagal.");
          return;
        }
        setState("success");
        setMessage(
          body.trialGranted
            ? "Email terverifikasi. Trial Premium 7 hari sudah aktif."
            : "Email berhasil diverifikasi."
        );
      } catch {
        if (!cancelled) {
          setState("error");
          setMessage("Gagal menghubungi server. Coba lagi.");
        }
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [token]);

  return (
    <main className="mx-auto flex min-h-screen w-full max-w-md items-center px-4">
      <Card className="w-full">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-lg">
            {state === "loading" && <Loader2 className="h-5 w-5 animate-spin text-primary" />}
            {state === "success" && <CheckCircle2 className="h-5 w-5 text-emerald-600" />}
            {state === "error" && <XCircle className="h-5 w-5 text-destructive" />}
            Verifikasi Email
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <p className="text-sm text-muted-foreground" aria-live="polite">
            {message}
          </p>
          {state === "success" && (
            <Button asChild className="w-full">
              <Link href="/">Mulai Belajar</Link>
            </Button>
          )}
          {state === "error" && (
            <div className="space-y-2">
              <Button asChild variant="outline" className="w-full">
                <Link href="/login">Ke Halaman Masuk</Link>
              </Button>
              <p className="text-xs text-muted-foreground">
                Minta tautan baru dari banner di beranda setelah masuk.
              </p>
            </div>
          )}
        </CardContent>
      </Card>
    </main>
  );
}

export default function VerifyEmailPage() {
  return (
    <Suspense
      fallback={
        <main className="mx-auto flex min-h-screen w-full max-w-md items-center px-4">
          <p className="text-sm text-muted-foreground">Memuat verifikasi...</p>
        </main>
      }
    >
      <VerifyInner />
    </Suspense>
  );
}
