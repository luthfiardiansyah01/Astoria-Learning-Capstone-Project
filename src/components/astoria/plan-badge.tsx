"use client";

import { useEffect, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Crown, Sparkles, Check, Loader2, ExternalLink, ReceiptText } from "lucide-react";
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
import { CONTACT_EMAIL } from "@/lib/contact";

interface PlanData {
  plan: Plan;
  meta: { name: string; price: string; description: string };
  limits: typeof PLAN_LIMITS.free;
  planExpiresAt?: string | null;
  trialUsedAt?: string | null;
}

interface BillingConfigData {
  provider: "midtrans" | "xendit" | "none";
  configured: boolean;
  price: number;
  durationDays: number;
}

interface PaymentRow {
  id: string;
  orderId: string;
  provider: string;
  amount: number;
  status: "pending" | "paid" | "failed" | "expired" | "refunded" | "cancelled";
  durationDays: number;
  checkoutUrl?: string | null;
  paidAt?: string | null;
  expiresAt?: string | null;
  createdAt: string;
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

function rupiah(value: number) {
  return new Intl.NumberFormat("id-ID", { style: "currency", currency: "IDR", maximumFractionDigits: 0 }).format(value);
}

const STATUS_LABEL: Record<PaymentRow["status"], string> = {
  pending: "Menunggu",
  paid: "Lunas",
  failed: "Gagal",
  expired: "Kedaluwarsa",
  refunded: "Dikembalikan",
  cancelled: "Dibatalkan",
};

const STATUS_CLASS: Record<PaymentRow["status"], string> = {
  pending: "bg-amber-100 text-amber-800 dark:bg-amber-950 dark:text-amber-300",
  paid: "bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300",
  failed: "bg-red-100 text-red-800 dark:bg-red-950 dark:text-red-300",
  expired: "bg-muted text-muted-foreground",
  refunded: "bg-blue-100 text-blue-800 dark:bg-blue-950 dark:text-blue-300",
  cancelled: "bg-muted text-muted-foreground",
};

export function PlanBadge({ className = "" }: { className?: string }) {
  const [open, setOpen] = useState(false);
  const [billingError, setBillingError] = useState<string | null>(null);
  const queryClient = useQueryClient();

  const { data } = useQuery<PlanData>({
    queryKey: ["plan"],
    queryFn: async () => {
      const res = await fetch("/api/plan");
      if (!res.ok) throw new Error("Gagal memuat paket.");
      return res.json();
    },
    staleTime: 60_000,
    refetchOnWindowFocus: true,
    refetchInterval: 60_000,
  });

  const { data: billing } = useQuery<BillingConfigData>({
    queryKey: ["billing-config"],
    queryFn: async () => {
      const res = await fetch("/api/billing/config");
      if (!res.ok) throw new Error("Gagal memuat konfigurasi pembayaran.");
      return res.json();
    },
    staleTime: 60_000,
  });

  const { data: paymentData, isFetching: loadingPayments } = useQuery<{ payments: PaymentRow[] }>({
    queryKey: ["billing-payments"],
    queryFn: async () => {
      const res = await fetch("/api/billing/payments");
      if (!res.ok) throw new Error("Gagal memuat riwayat pembayaran.");
      return res.json();
    },
    enabled: open,
    staleTime: 15_000,
  });

  const refreshPlan = () => {
    queryClient.invalidateQueries({ queryKey: ["plan"] });
    queryClient.invalidateQueries({ queryKey: ["ai-usage"] });
    queryClient.invalidateQueries({ queryKey: ["profile"] });
    queryClient.invalidateQueries({ queryKey: ["billing-payments"] });
  };

  // Kembali dari halaman pembayaran: segarkan paket beberapa saat kemudian.
  useEffect(() => {
    if (typeof window === "undefined") return;
    const params = new URLSearchParams(window.location.search);
    if (!params.get("billing")) return;

    const state = params.get("billing");
    toast.info(
      state === "finish"
        ? "Pembayaran diterima. Paket akan diperbarui otomatis setelah gateway mengonfirmasi."
        : "Pembayaran belum berhasil. Silakan coba lagi."
    );
    refreshPlan();
    const timer = setTimeout(refreshPlan, 4000);
    params.delete("billing");
    const qs = params.toString();
    window.history.replaceState({}, "", `${window.location.pathname}${qs ? `?${qs}` : ""}`);
    return () => clearTimeout(timer);
  }, []);

  const trialMutation = useMutation({
    mutationFn: async () => {
      const res = await fetch("/api/plan", { method: "POST" });
      const body = await res.json();
      if (!res.ok) throw new Error(body.error || "Gagal mengaktifkan trial.");
      return body;
    },
    onSuccess: () => {
      refreshPlan();
      toast.success("Trial Premium 7 hari aktif.");
      setOpen(false);
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const checkoutMutation = useMutation({
    mutationFn: async () => {
      const res = await fetch("/api/billing/checkout", { method: "POST" });
      const body = await res.json();
      if (!res.ok) throw new Error(body.error || "Gagal membuat transaksi.");
      if (!body.checkoutUrl) throw new Error("Gateway tidak mengembalikan URL pembayaran.");
      return body as { checkoutUrl: string };
    },
    onSuccess: ({ checkoutUrl }) => {
      window.location.href = checkoutUrl;
    },
    onError: (e: Error) => {
      setBillingError(e.message);
      toast.error(e.message);
    },
  });

  const cancelMutation = useMutation({
    mutationFn: async (paymentId: string) => {
      const res = await fetch(`/api/billing/payments/${paymentId}`, { method: "DELETE" });
      const body = await res.json();
      if (!res.ok) throw new Error(body.error || "Gagal membatalkan pesanan.");
      return body as { warning?: string };
    },
    onSuccess: (body) => {
      refreshPlan();
      toast.success(
        body.warning
          ? "Pesanan dibatalkan. Gateway tidak dapat dibatalkan otomatis."
          : "Pesanan berhasil dibatalkan."
      );
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const cancelPayment = (paymentId: string) => {
    if (!window.confirm("Batalkan pesanan ini? Tautan pembayaran tidak akan digunakan lagi.")) return;
    cancelMutation.mutate(paymentId);
  };

  const plan = data?.plan ?? "free";
  const premium = plan === "premium";
  const configured = billing?.configured ?? false;
  const price = billing?.price ?? 19_000;
  const durationDays = billing?.durationDays ?? 30;
  const providerLabel =
    billing?.provider === "midtrans" ? "Midtrans" : billing?.provider === "xendit" ? "Xendit" : null;
  const payments = paymentData?.payments ?? [];
  const pendingPayment = payments.find(
    (p) => p.status === "pending" && p.checkoutUrl && p.provider === billing?.provider
  );

  return (
    <>
      <button
        type="button"
        onClick={() => {
          setBillingError(null);
          setOpen(true);
        }}
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
        <DialogContent className="sm:max-w-2xl max-h-[90vh] overflow-y-auto astoria-scroll">
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
                <li>1 tim dibuat, 2 proyek, 10 tugas</li>
                <li>Maks 3 anggota tim</li>
              </ul>
            </div>

            <div className={`rounded-xl border p-4 ${premium ? "border-amber-400 bg-amber-50/50 dark:bg-amber-950/20" : ""}`}>
              <div className="flex items-center justify-between">
                <p className="font-semibold text-sm">Premium</p>
                <Crown className="h-4 w-4 text-amber-600" />
              </div>
              <p className="text-2xl font-bold mt-1">{rupiah(price)}</p>
              <p className="text-[10px] text-muted-foreground">per {durationDays} hari</p>
              <ul className="mt-3 space-y-1.5 text-xs">
                <li className="flex gap-1.5"><Check className="h-3 w-3 text-emerald-600 mt-0.5" /> AI {PLAN_LIMITS.premium.aiPerDay}/hari</li>
                <li className="flex gap-1.5"><Check className="h-3 w-3 text-emerald-600 mt-0.5" /> Dokumen {PLAN_LIMITS.premium.maxDocChars.toLocaleString("id-ID")} karakter</li>
                <li className="flex gap-1.5"><Check className="h-3 w-3 text-emerald-600 mt-0.5" /> PDF maks 5 MB</li>
                <li className="flex gap-1.5"><Check className="h-3 w-3 text-emerald-600 mt-0.5" /> 10 tim dibuat, 10 proyek, 100 tugas</li>
                <li className="flex gap-1.5"><Check className="h-3 w-3 text-emerald-600 mt-0.5" /> Maks 30 anggota tim</li>
              </ul>
            </div>
          </div>

          <div className="rounded-lg border bg-muted/40 px-3 py-2 text-xs">
            {configured ? (
              <p className="flex items-center gap-1.5 text-muted-foreground">
                <Check className="h-3.5 w-3.5 text-emerald-600" />
                Pembayaran otomatis via <strong>{providerLabel}</strong> aktif.
                {billing?.durationDays ? ` Langganan ${billing.durationDays} hari.` : ""}
              </p>
            ) : (
              <p className="text-muted-foreground">
                <strong className="text-foreground">Pembayaran otomatis belum tersedia.</strong>{" "}
                Untuk mengaktifkan Premium, ajukan ke admin. Aktivasi dilakukan manual setelah
                pembayaran dikonfirmasi.
              </p>
            )}
            {billingError && <p className="mt-1.5 text-destructive">{billingError}</p>}
            {data?.trialUsedAt && !premium && (
              <p className="mt-1.5 text-muted-foreground">Masa trial sudah pernah digunakan.</p>
            )}
          </div>

          <p className="text-[11px] text-muted-foreground">
            Semua akun baru otomatis mendapat <strong>trial Premium 7 hari</strong>. Setelah
            berakhir, akun kembali ke Free. Selama trial, fitur Premium terbuka tetapi kuota AI
            tetap dibatasi dan direset setiap <strong>00.00 WIB</strong>.
          </p>

          <p className="text-[10px] leading-relaxed text-muted-foreground">
            Dengan melanjutkan pembayaran, Anda menyetujui{" "}
            <a href="/legal/syarat-ketentuan" className="underline hover:text-foreground">
              Syarat & Ketentuan
            </a>
            ,{" "}
            <a
              href="/legal/kebijakan-pengembalian-dana"
              className="underline hover:text-foreground"
            >
              Kebijakan Pengembalian Dana
            </a>
            , dan{" "}
            <a href="/legal/kebijakan-produk" className="underline hover:text-foreground">
              Kebijakan Produk
            </a>
            .
          </p>

          {payments.length > 0 && (
            <div className="space-y-2">
              <p className="flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                <ReceiptText className="h-3.5 w-3.5" /> Riwayat pembayaran
              </p>
              <div className="space-y-1.5">
                {payments.slice(0, 4).map((p) => (
                  <div
                    key={p.id}
                    className="flex items-center justify-between gap-2 rounded-lg border px-3 py-2 text-xs"
                  >
                    <div className="min-w-0">
                      <p className="truncate font-medium">{rupiah(p.amount)} · {p.durationDays} hari</p>
                      <p className="text-muted-foreground">
                        {formatDate(p.createdAt)} · {p.provider}
                      </p>
                    </div>
                    <div className="flex shrink-0 items-center gap-2">
                      <span className={`rounded-full px-2 py-0.5 text-[10px] font-semibold ${STATUS_CLASS[p.status]}`}>
                        {STATUS_LABEL[p.status]}
                      </span>
                      {p.status === "pending" && p.checkoutUrl && (
                        <a
                          href={p.checkoutUrl}
                          className="inline-flex items-center gap-0.5 font-medium text-primary hover:underline"
                        >
                          Lanjut <ExternalLink className="h-3 w-3" />
                        </a>
                      )}
                      {p.status === "pending" && (
                        <button
                          type="button"
                          onClick={() => cancelPayment(p.id)}
                          disabled={cancelMutation.isPending}
                          className="font-medium text-destructive hover:underline disabled:opacity-50"
                        >
                          Batalkan
                        </button>
                      )}
                    </div>
                  </div>
                ))}
              </div>
              {loadingPayments && <p className="text-[11px] text-muted-foreground">Memuat riwayat…</p>}
            </div>
          )}

          <DialogFooter className="flex-col sm:flex-row gap-2">
            {!premium && !data?.trialUsedAt && (
              <Button
                variant="outline"
                onClick={() => trialMutation.mutate()}
                disabled={trialMutation.isPending || checkoutMutation.isPending}
              >
                {trialMutation.isPending ? (
                  <Loader2 className="mr-1.5 h-4 w-4 animate-spin" />
                ) : (
                  <Sparkles className="mr-1.5 h-4 w-4" />
                )}
                Coba Premium 7 hari
              </Button>
            )}

            {configured ? (
              <Button
                onClick={() => checkoutMutation.mutate()}
                disabled={checkoutMutation.isPending || trialMutation.isPending}
              >
                {checkoutMutation.isPending && <Loader2 className="mr-1.5 h-4 w-4 animate-spin" />}
                {premium ? `Perpanjang ${billing?.durationDays ?? 30} hari` : "Upgrade Sekarang"}
              </Button>
            ) : (
              <Button asChild>
                <a href={`mailto:${CONTACT_EMAIL}?subject=Upgrade%20Premium%20SOBAT%20ADI`}>
                  Ajukan Premium ke Admin
                </a>
              </Button>
            )}

            {configured && pendingPayment && (
              <Button variant="outline" asChild>
                <a href={pendingPayment.checkoutUrl ?? "#"}>
                  <ExternalLink className="mr-1.5 h-4 w-4" /> Lanjutkan pembayaran
                </a>
              </Button>
            )}

            {configured && pendingPayment && (
              <Button
                variant="ghost"
                className="text-destructive hover:text-destructive"
                onClick={() => cancelPayment(pendingPayment.id)}
                disabled={cancelMutation.isPending}
              >
                {cancelMutation.isPending ? "Membatalkan…" : "Batalkan pesanan"}
              </Button>
            )}
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
