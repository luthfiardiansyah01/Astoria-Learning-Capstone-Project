"use client";

import { useMutation, useQuery } from "@tanstack/react-query";
import { MailWarning } from "lucide-react";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";

interface PlanStatus {
  emailVerified: boolean;
  emailVerificationRequired: boolean;
}

export function EmailVerificationBanner() {
  const { data } = useQuery<PlanStatus>({
    queryKey: ["plan"],
    queryFn: async () => {
      const res = await fetch("/api/plan");
      if (!res.ok) throw new Error("Gagal memuat status email.");
      return res.json();
    },
    staleTime: 60_000,
  });

  const resend = useMutation({
    mutationFn: async () => {
      const res = await fetch("/api/auth/verify-email/resend", { method: "POST" });
      const body = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(body.error || "Gagal mengirim email verifikasi.");
      return body as { verificationUrl?: string };
    },
    onSuccess: (body) => {
      toast.success(
        body.verificationUrl
          ? "Email verifikasi dibuat. Buka tautan development di server log."
          : "Email verifikasi dikirim. Cek inbox dan folder spam."
      );
    },
    onError: (e: Error) => toast.error(e.message),
  });

  if (!data?.emailVerificationRequired || data.emailVerified) return null;

  return (
    <div className="mb-4 flex flex-col gap-2 rounded-xl border border-amber-300 bg-amber-50 p-3 text-amber-900 sm:flex-row sm:items-center sm:justify-between dark:border-amber-800 dark:bg-amber-950/40 dark:text-amber-200">
      <p className="flex items-start gap-2 text-sm">
        <MailWarning className="mt-0.5 h-4 w-4 shrink-0" />
        <span>
          Email belum diverifikasi. Verifikasi untuk mengaktifkan trial Premium 7 hari dan
          menggunakan fitur AI.
        </span>
      </p>
      <Button
        size="sm"
        variant="outline"
        className="shrink-0 border-amber-400 bg-transparent text-amber-900 hover:bg-amber-100 dark:text-amber-200 dark:hover:bg-amber-900/40"
        onClick={() => resend.mutate()}
        disabled={resend.isPending}
      >
        {resend.isPending ? "Mengirim..." : "Kirim ulang email"}
      </Button>
    </div>
  );
}
