// Panel admin untuk mengelola paket pengguna & memantau pembayaran.
"use client";

import { useEffect, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  Crown,
  Users,
  Search,
  Loader2,
  CheckCircle2,
  XCircle,
  RotateCcw,
  ReceiptText,
  CreditCard,
  AlertTriangle,
  ChevronLeft,
  ChevronRight,
} from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { toast } from "sonner";

interface BillingConfigData {
  provider: "midtrans" | "xendit" | "none";
  configured: boolean;
  price: number;
  durationDays: number;
  requiredEnv: { key: string; set: boolean; hint: string }[];
  webhookUrls: { midtrans: string; xendit: string };
}

interface AdminUser {
  id: string;
  name: string;
  email: string | null;
  role: string;
  plan: string;
  effectivePlan: "free" | "premium";
  planExpiresAt: string | null;
  trialUsedAt: string | null;
  createdAt: string;
  _count: { documents: number; teamMemberships: number; payments: number };
}

interface UsersResponse {
  users: AdminUser[];
  total: number;
  page: number;
  perPage: number;
  stats: { total: number; free: number; premium: number; trialUsed: number };
}

interface AdminPayment {
  id: string;
  orderId: string;
  provider: string;
  amount: number;
  status: "pending" | "paid" | "failed" | "expired" | "refunded" | "cancelled";
  durationDays: number;
  createdAt: string;
  paidAt: string | null;
  expiresAt: string | null;
  user: { id: string; name: string; email: string | null };
}

interface PaymentsResponse {
  payments: AdminPayment[];
  stats: { pending: number; paid: number; failed: number; revenue: number };
  config: BillingConfigData;
}

const STATUS_LABEL: Record<AdminPayment["status"], string> = {
  pending: "Menunggu",
  paid: "Lunas",
  failed: "Gagal",
  expired: "Kedaluwarsa",
  refunded: "Refund",
  cancelled: "Dibatalkan",
};

function formatDate(value?: string | null) {
  if (!value) return "—";
  return new Intl.DateTimeFormat("id-ID", {
    timeZone: "Asia/Jakarta",
    day: "numeric",
    month: "short",
    year: "numeric",
  }).format(new Date(value));
}

function rupiah(value: number) {
  return new Intl.NumberFormat("id-ID", {
    style: "currency",
    currency: "IDR",
    maximumFractionDigits: 0,
  }).format(value);
}

export function AdminPlanPanel() {
  const queryClient = useQueryClient();
  const [search, setSearch] = useState("");
  const [q, setQ] = useState("");
  const [planFilter, setPlanFilter] = useState("all");
  const [page, setPage] = useState(1);
  const [days, setDays] = useState("30");

  useEffect(() => {
    const timer = setTimeout(() => {
      setQ(search.trim());
      setPage(1);
    }, 350);
    return () => clearTimeout(timer);
  }, [search]);

  const usersQuery = useQuery<UsersResponse>({
    queryKey: ["admin-users", q, planFilter, page],
    queryFn: async () => {
      const params = new URLSearchParams({ page: String(page), plan: planFilter });
      if (q) params.set("q", q);
      const res = await fetch(`/api/admin/users?${params}`);
      if (!res.ok) throw new Error("Gagal memuat pengguna.");
      return res.json();
    },
    placeholderData: (prev) => prev,
  });

  const paymentsQuery = useQuery<PaymentsResponse>({
    queryKey: ["admin-payments"],
    queryFn: async () => {
      const res = await fetch("/api/admin/payments");
      if (!res.ok) throw new Error("Gagal memuat pembayaran.");
      return res.json();
    },
  });

  const planMutation = useMutation({
    mutationFn: async (input: { userId: string; plan: "free" | "premium"; resetTrial?: boolean }) => {
      const res = await fetch(`/api/admin/users/${input.userId}/plan`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          plan: input.plan,
          days: input.plan === "premium" ? Number(days) : undefined,
          resetTrial: input.resetTrial,
        }),
      });
      const body = await res.json();
      if (!res.ok) throw new Error(body.error || "Gagal mengubah paket.");
      return body;
    },
    onSuccess: (_body, input) => {
      queryClient.invalidateQueries({ queryKey: ["admin-users"] });
      queryClient.invalidateQueries({ queryKey: ["admin-payments"] });
      toast.success(
        input.resetTrial
          ? "Trial pengguna direset."
          : input.plan === "premium"
            ? "Premium diaktifkan."
            : "Paket diubah ke Free."
      );
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const paymentMutation = useMutation({
    mutationFn: async (input: { paymentId: string; status: "paid" | "failed" | "cancelled" }) => {
      const res = await fetch(`/api/admin/payments/${input.paymentId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status: input.status }),
      });
      const body = await res.json();
      if (!res.ok) throw new Error(body.error || "Gagal memperbarui pembayaran.");
      return body;
    },
    onSuccess: (_body, input) => {
      queryClient.invalidateQueries({ queryKey: ["admin-payments"] });
      queryClient.invalidateQueries({ queryKey: ["admin-users"] });
      toast.success(input.status === "paid" ? "Pembayaran dikonfirmasi lunas." : "Pembayaran dibatalkan.");
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const data = usersQuery.data;
  const paymentsData = paymentsQuery.data;
  const totalPages = data ? Math.max(1, Math.ceil(data.total / data.perPage)) : 1;
  const busy = planMutation.isPending || paymentMutation.isPending;
  const config = paymentsData?.config;

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-base">
          <Crown className="h-4 w-4 text-amber-600" /> Paket &amp; Pembayaran
        </CardTitle>
        <p className="text-xs text-muted-foreground">
          Kelola langganan pengguna dan konfirmasi pembayaran manual.
        </p>
      </CardHeader>
      <CardContent className="space-y-5">
        {/* Ringkasan */}
        <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
          <div className="rounded-xl bg-amber-50 p-3 dark:bg-amber-950/40">
            <p className="text-lg font-bold text-amber-700 dark:text-amber-400">
              {data?.stats.premium ?? 0}
            </p>
            <p className="text-[11px] text-muted-foreground">Premium</p>
          </div>
          <div className="rounded-xl bg-muted p-3">
            <p className="text-lg font-bold">{data?.stats.free ?? 0}</p>
            <p className="text-[11px] text-muted-foreground">Free</p>
          </div>
          <div className="rounded-xl bg-muted p-3">
            <p className="text-lg font-bold">{data?.stats.trialUsed ?? 0}</p>
            <p className="text-[11px] text-muted-foreground">Trial terpakai</p>
          </div>
          <div className="rounded-xl bg-emerald-50 p-3 dark:bg-emerald-950/40">
            <p className="text-lg font-bold text-emerald-700 dark:text-emerald-400">
              {rupiah(paymentsData?.stats.revenue ?? 0)}
            </p>
            <p className="text-[11px] text-muted-foreground">Pendapatan</p>
          </div>
        </div>

        {/* Status gateway */}
        <div className="rounded-xl border bg-muted/40 p-3 text-xs">
          <div className="flex items-center gap-2">
            <CreditCard className="h-3.5 w-3.5 text-primary" />
            <span className="font-semibold">Payment gateway</span>
            {config?.configured ? (
              <Badge variant="default" className="text-[10px]">
                {config.provider === "midtrans" ? "Midtrans aktif" : "Xendit aktif"}
              </Badge>
            ) : (
              <Badge variant="secondary" className="text-[10px]">
                Belum dikonfigurasi
              </Badge>
            )}
          </div>

          {config?.configured ? (
            <p className="mt-1.5 text-muted-foreground">
              Harga {rupiah(config.price)} / {config.durationDays} hari. Webhook:{" "}
              <code className="break-all">{config.provider === "midtrans" ? config.webhookUrls.midtrans : config.webhookUrls.xendit}</code>
            </p>
          ) : (
            <div className="mt-1.5 space-y-1.5 text-muted-foreground">
              <p className="flex items-start gap-1.5">
                <AlertTriangle className="mt-0.5 h-3.5 w-3.5 shrink-0 text-amber-600" />
                Isi kredensial di environment Vercel, lalu redeploy. Pengguna tetap bisa diaktifkan
                manual dari daftar di bawah.
              </p>
              <div className="flex flex-wrap gap-1.5">
                {(config?.requiredEnv ?? []).map((env) => (
                  <span
                    key={env.key}
                    title={env.hint}
                    className={`rounded-full px-2 py-0.5 text-[10px] font-mono ${
                      env.set
                        ? "bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300"
                        : "bg-muted text-muted-foreground"
                    }`}
                  >
                    {env.set ? "✓" : "○"} {env.key}
                  </span>
                ))}
              </div>
              <p className="text-[10px]">
                Webhook Midtrans: <code className="break-all">{config?.webhookUrls.midtrans}</code>
              </p>
              <p className="text-[10px]">
                Webhook Xendit: <code className="break-all">{config?.webhookUrls.xendit}</code>
              </p>
            </div>
          )}
        </div>

        {/* Filter pengguna */}
        <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
          <div className="relative flex-1">
            <Search className="pointer-events-none absolute left-2.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-muted-foreground" />
            <Input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Cari nama atau email…"
              className="h-9 pl-8 text-sm"
            />
          </div>
          <Select
            value={planFilter}
            onValueChange={(v) => {
              setPlanFilter(v);
              setPage(1);
            }}
          >
            <SelectTrigger size="sm" className="w-full sm:w-36" aria-label="Filter paket">
              <SelectValue placeholder="Semua paket" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Semua paket</SelectItem>
              <SelectItem value="free">Free</SelectItem>
              <SelectItem value="premium">Premium</SelectItem>
            </SelectContent>
          </Select>
          <Select value={days} onValueChange={setDays}>
            <SelectTrigger size="sm" className="w-full sm:w-32" aria-label="Durasi Premium">
              <SelectValue placeholder="Durasi" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="30">30 hari</SelectItem>
              <SelectItem value="90">90 hari</SelectItem>
              <SelectItem value="365">365 hari</SelectItem>
            </SelectContent>
          </Select>
        </div>

        {/* Daftar pengguna */}
        {usersQuery.isLoading ? (
          <div className="space-y-2">
            {[...Array(4)].map((_, i) => (
              <div key={i} className="h-14 rounded-xl bg-muted animate-pulse" />
            ))}
          </div>
        ) : data && data.users.length === 0 ? (
          <p className="py-6 text-center text-sm text-muted-foreground">
            Tidak ada pengguna yang cocok.
          </p>
        ) : (
          <div className="space-y-2">
            {data?.users.map((u) => {
              const isAdmin = u.role === "admin";
              const premium = u.effectivePlan === "premium";
              return (
                <div
                  key={u.id}
                  className="flex flex-col gap-2 rounded-xl border p-3 sm:flex-row sm:items-center sm:justify-between"
                >
                  <div className="min-w-0">
                    <div className="flex flex-wrap items-center gap-1.5">
                      <p className="truncate text-sm font-medium">{u.name}</p>
                      <Badge variant={premium ? "default" : "secondary"} className="text-[10px]">
                        {isAdmin ? "Admin" : premium ? "Premium" : "Free"}
                      </Badge>
                      {u.trialUsedAt && (
                        <Badge variant="outline" className="text-[10px]">
                          trial terpakai
                        </Badge>
                      )}
                    </div>
                    <p className="truncate text-xs text-muted-foreground">
                      {u.email ?? "tanpa email"}
                    </p>
                    <p className="mt-0.5 text-[11px] text-muted-foreground">
                      {isAdmin
                        ? "Akses admin selalu Premium"
                        : premium
                          ? `Aktif s/d ${u.planExpiresAt ? formatDate(u.planExpiresAt) : "tanpa batas"}`
                          : "Paket Free"}
                      {" · "}
                      {u._count.documents} dokumen · {u._count.teamMemberships} tim
                    </p>
                  </div>

                  {!isAdmin && (
                    <div className="flex shrink-0 flex-wrap items-center gap-1.5">
                      <Button
                        size="sm"
                        variant="outline"
                        disabled={busy}
                        onClick={() =>
                          planMutation.mutate({ userId: u.id, plan: "premium" })
                        }
                        className="text-amber-700 hover:text-amber-800 dark:text-amber-400"
                      >
                        <Crown className="mr-1 h-3.5 w-3.5" />
                        {premium ? "Perpanjang" : "Premium"}
                      </Button>
                      {premium && (
                        <Button
                          size="sm"
                          variant="ghost"
                          disabled={busy}
                          onClick={() => planMutation.mutate({ userId: u.id, plan: "free" })}
                          className="text-muted-foreground hover:text-destructive"
                        >
                          <XCircle className="mr-1 h-3.5 w-3.5" /> Free
                        </Button>
                      )}
                      {u.trialUsedAt && (
                        <Button
                          size="icon"
                          variant="ghost"
                          className="h-8 w-8 text-muted-foreground"
                          disabled={busy}
                          title="Reset masa trial"
                          aria-label="Reset masa trial"
                          onClick={() =>
                            planMutation.mutate({ userId: u.id, plan: "free", resetTrial: true })
                          }
                        >
                          <RotateCcw className="h-3.5 w-3.5" />
                        </Button>
                      )}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}

        {data && data.total > data.perPage && (
          <div className="flex items-center justify-between text-xs text-muted-foreground">
            <span>
              Halaman {data.page} dari {totalPages} · {data.total} pengguna
            </span>
            <div className="flex gap-1">
              <Button
                size="icon"
                variant="outline"
                className="h-7 w-7"
                disabled={page <= 1}
                onClick={() => setPage((p) => Math.max(1, p - 1))}
                aria-label="Halaman sebelumnya"
              >
                <ChevronLeft className="h-3.5 w-3.5" />
              </Button>
              <Button
                size="icon"
                variant="outline"
                className="h-7 w-7"
                disabled={page >= totalPages}
                onClick={() => setPage((p) => p + 1)}
                aria-label="Halaman berikutnya"
              >
                <ChevronRight className="h-3.5 w-3.5" />
              </Button>
            </div>
          </div>
        )}

        {/* Pembayaran terbaru */}
        <div className="space-y-2 border-t pt-4">
          <p className="flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
            <ReceiptText className="h-3.5 w-3.5" /> Pembayaran terbaru
          </p>
          {paymentsQuery.isLoading ? (
            <div className="h-16 rounded-xl bg-muted animate-pulse" />
          ) : !paymentsData || paymentsData.payments.length === 0 ? (
            <p className="py-4 text-center text-xs text-muted-foreground">
              Belum ada transaksi. Transaksi muncul setelah pengguna memulai pembayaran.
            </p>
          ) : (
            <div className="max-h-72 space-y-1.5 overflow-y-auto astoria-scroll pr-1">
              {paymentsData.payments.map((p) => (
                <div
                  key={p.id}
                  className="flex flex-col gap-2 rounded-lg border px-3 py-2 text-xs sm:flex-row sm:items-center sm:justify-between"
                >
                  <div className="min-w-0">
                    <p className="truncate font-medium">
                      {p.user.name} · {rupiah(p.amount)}
                    </p>
                    <p className="truncate text-muted-foreground">
                      {p.orderId} · {formatDate(p.createdAt)}
                    </p>
                  </div>
                  <div className="flex shrink-0 items-center gap-1.5">
                    <Badge
                      variant={
                        p.status === "paid"
                          ? "default"
                          : p.status === "pending"
                            ? "secondary"
                            : "destructive"
                      }
                      className="text-[10px]"
                    >
                      {STATUS_LABEL[p.status]}
                    </Badge>
                    {p.status === "pending" && (
                      <>
                        <Button
                          size="icon"
                          variant="ghost"
                          className="h-7 w-7 text-emerald-600"
                          disabled={busy}
                          title="Tandai lunas"
                          aria-label="Tandai lunas"
                          onClick={() => paymentMutation.mutate({ paymentId: p.id, status: "paid" })}
                        >
                          <CheckCircle2 className="h-4 w-4" />
                        </Button>
                        <Button
                          size="icon"
                          variant="ghost"
                          className="h-7 w-7 text-destructive"
                          disabled={busy}
                          title="Batalkan pesanan"
                          aria-label="Batalkan pesanan"
                          onClick={() => paymentMutation.mutate({ paymentId: p.id, status: "cancelled" })}
                        >
                          <XCircle className="h-4 w-4" />
                        </Button>
                      </>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
          {busy && (
            <p className="flex items-center gap-1.5 text-[11px] text-muted-foreground">
              <Loader2 className="h-3 w-3 animate-spin" /> Memproses…
            </p>
          )}
        </div>

        <p className="flex items-center gap-1.5 text-[11px] text-muted-foreground">
          <Users className="h-3.5 w-3.5" /> Setiap perubahan paket langsung berlaku dan mengirim
          notifikasi ke pengguna.
        </p>
      </CardContent>
    </Card>
  );
}
