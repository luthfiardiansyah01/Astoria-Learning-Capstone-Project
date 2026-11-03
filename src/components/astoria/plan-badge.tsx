"use client";

import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Crown, Sparkles, Check, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { toast } from "sonner";
import { PLAN_LIMITS, type Plan } from "@/lib/plans";

interface PlanData {
  plan: Plan;
  meta: { name: string; price: string; description: string };
  limits: typeof PLAN_LIMITS.free;
  planExpiresAt?: string | null;
  trialUsedAt?: string | null;
}

function formatDate(value?: string | null) {
  if (!value) return null;
  return new Intl.DateTimeFormat("id-ID", {
    timeZone: "Asia/Jakarta",
    day: "numeric",
    month: "long",
    year: "numeric",
  }).format(new Date(value));
}

export function PlanBadge({ className = "" }: { className?: string }) {
  const [open, setOpen] = useState(false);
  const queryClient = useQueryClient();

  const { data } = useQuery<PlanData>({
    queryKey: ["plan"],
    queryFn: async () => {
      const res = await fetch("/api/plan");
      if (!res.ok) throw new Error("Gagal memuat paket.");
      return res.json();
    },
    staleTime: 60_000,
  });

  const trialMutation = useMutation({
    mutationFn: async () => {
      const res = await fetch("/api/plan", { method: "POST" });
      const body = await res.json();
      if (!res.ok) throw new Error(body.error || "Gagal mengaktifkan trial.");
      return body;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["plan"] });
      queryClient.invalidateQueries({ queryKey: ["ai-usage"] });
      queryClient.invalidateQueries({ queryKey: ["profile"] });
      toast.success("Trial Premium 7 hari aktif.");
      setOpen(false);
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const plan = data?.plan ?? "free";
  const premium = plan === "premium";

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        title="Lihat paket Free/Premium"
        className={`inline-flex items-center gap-1 rounded-full px-2.5 py-1 text-[11px] font-semibold transition-colors ${
          premium
            ? "bg-amber-100 text-amber-800 hover:bg-amber-200 dark:bg-amber-950 dark:text-amber-300"
            : "bg-muted text-muted-foreground hover:bg-muted/80"
        } ${className}`}
      >
        {premium ? <Crown className="h-3 w-3" /> : <Sparkles className="h-3 w-3" />}
        {premium ? "Premium" : "Free"}
      </button>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="sm:max-w-lg">
          <DialogHeader>
            <DialogTitle>Paket SOBAT ADI</DialogTitle>
            <DialogDescription>
              Paket aktif: <strong>{premium ? "Premium" : "Free"}</strong>
              {data?.planExpiresAt && premium
                ? ` — berlaku sampai ${formatDate(data.planExpiresAt)}`
                : ""}
            </DialogDescription>
          </DialogHeader>

          <div className="grid gap-3 sm:grid-cols-2">
            <div className={`rounded-xl border p-4 ${!premium ? "border-primary bg-primary/5" : ""}`}>
              <p className="font-semibold text-sm">Free</p>
              <p className="text-2xl font-bold mt-1">Rp0</p>
              <ul className="mt-3 space-y-1.5 text-xs text-muted-foreground">
                <li>AI {PLAN_LIMITS.free.aiPerDay}/hari</li>
                <li>Dokumen {PLAN_LIMITS.free.maxDocChars.toLocaleString("id-ID")} karakter</li>
                <li>PDF maks 2 MB</li>
                <li>1 tim, 2 proyek, 10 tugas</li>
                <li>Maks 3 anggota tim</li>
              </ul>
            </div>

            <div className={`rounded-xl border p-4 ${premium ? "border-amber-400 bg-amber-50/50 dark:bg-amber-950/20" : ""}`}>
              <div className="flex items-center justify-between">
                <p className="font-semibold text-sm">Premium</p>
                <Crown className="h-4 w-4 text-amber-600" />
              </div>
              <p className="text-2xl font-bold mt-1">Rp19.000</p>
              <p className="text-[10px] text-muted-foreground">per bulan</p>
              <ul className="mt-3 space-y-1.5 text-xs">
                <li className="flex gap-1.5"><Check className="h-3 w-3 text-emerald-600 mt-0.5" /> AI {PLAN_LIMITS.premium.aiPerDay}/hari</li>
                <li className="flex gap-1.5"><Check className="h-3 w-3 text-emerald-600 mt-0.5" /> Dokumen {PLAN_LIMITS.premium.maxDocChars.toLocaleString("id-ID")} karakter</li>
                <li className="flex gap-1.5"><Check className="h-3 w-3 text-emerald-600 mt-0.5" /> PDF maks 5 MB</li>
                <li className="flex gap-1.5"><Check className="h-3 w-3 text-emerald-600 mt-0.5" /> 10 tim, 10 proyek, 100 tugas</li>
                <li className="flex gap-1.5"><Check className="h-3 w-3 text-emerald-600 mt-0.5" /> Maks 30 anggota tim</li>
              </ul>
            </div>
          </div>

          <p className="text-xs text-muted-foreground">
            Pembayaran otomatis belum aktif. Untuk mengaktifkan Premium berbayar, hubungi admin.
            {data?.trialUsedAt ? " Masa trial sudah pernah digunakan." : ""}
          </p>

          <DialogFooter className="flex-col sm:flex-row gap-2">
            {!premium && !data?.trialUsedAt && (
              <Button
                variant="outline"
                onClick={() => trialMutation.mutate()}
                disabled={trialMutation.isPending}
              >
                {trialMutation.isPending ? (
                  <Loader2 className="mr-1.5 h-4 w-4 animate-spin" />
                ) : (
                  <Sparkles className="mr-1.5 h-4 w-4" />
                )}
                Coba Premium 7 hari
              </Button>
            )}
            <Button asChild>
              <a href="mailto:admin@sobat-adi.id?subject=Upgrade%20Premium%20SOBAT%20ADI">
                Ajukan Premium
              </a>
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
