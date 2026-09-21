// Panel Admin — Manajemen & Moderasi Dokumen (Seksi 5 spesifikasi)
// - Antrian moderasi dengan keputusan admin (aktifkan/review/tolak)
// - Dashboard analitik + AI Analytics Summarizer
"use client";

import { useEffect, useState } from "react";
import { motion } from "framer-motion";
import {
  Users,
  FileStack,
  MessageSquare,
  Target,
  ShieldCheck,
  CheckCircle2,
  Clock3,
  XCircle,
  Loader2,
  Sparkles,
  FileText,
  Trash2,
  BarChart3,
  TrendingUp,
} from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Markdown } from "./markdown";
import { useToast } from "@/hooks/use-toast";

interface AdminDoc {
  id: string;
  fileName: string;
  wordCount: number;
  status: string;
  uploader: string;
  createdAt: string;
  metadata: { ringkasan: string; mata_kuliah_terkait: string; topik_utama: string[] } | null;
  moderation: {
    layak: boolean;
    skor_kualitas: number;
    alasan: string;
    tag_otomatis: string[];
    rekomendasi_admin: string;
  } | null;
}

interface Analytics {
  totalUsers: number;
  docsThisWeek: number;
  totalChats: number;
  totalDocuments: number;
  totalQuiz: number;
  avgQuiz: number;
  statusBreakdown: { approved: number; pending: number; rejected: number };
  popular: { fileName: string; interaksi: number; kuis: number }[];
  topTopics: { kata: string; jumlah: number }[];
  insight: string | null;
}

const STATUS_META: Record<string, { label: string; variant: "default" | "secondary" | "destructive"; icon: React.ElementType }> = {
  approved: { label: "Aktif", variant: "default", icon: CheckCircle2 },
  pending: { label: "Review", variant: "secondary", icon: Clock3 },
  rejected: { label: "Ditolak", variant: "destructive", icon: XCircle },
};

export function AdminView() {
  const { toast } = useToast();
  const [docs, setDocs] = useState<AdminDoc[]>([]);
  const [analytics, setAnalytics] = useState<Analytics | null>(null);
  const [loading, setLoading] = useState(true);
  const [insightLoading, setInsightLoading] = useState(false);
  const [busyDoc, setBusyDoc] = useState<string | null>(null);

  const loadAll = async () => {
    setLoading(true);
    try {
      const [dRes, aRes] = await Promise.all([
        fetch("/api/documents"),
        fetch("/api/admin/analytics"),
      ]);
      const d = await dRes.json();
      const a = await aRes.json();
      setDocs(d.documents ?? []);
      setAnalytics(a.analytics ?? null);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadAll();
  }, []);

  const decide = async (documentId: string, decision: string) => {
    setBusyDoc(documentId);
    try {
      const res = await fetch("/api/admin/decision", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ documentId, decision }),
      });
      if (res.ok) {
        setDocs((prev) =>
          prev.map((d) => (d.id === documentId ? { ...d, status: decision } : d))
        );
        toast({
          title: `Dokumen ${decision === "approved" ? "diaktifkan" : decision === "rejected" ? "ditolak" : "dikembalikan ke review"} ✓`,
        });
      }
    } finally {
      setBusyDoc(null);
    }
  };

  const removeDoc = async (id: string) => {
    setBusyDoc(id);
    try {
      const res = await fetch(`/api/documents/${id}`, { method: "DELETE" });
      if (res.ok) {
        setDocs((prev) => prev.filter((d) => d.id !== id));
        toast({ title: "Dokumen dihapus 🗑️" });
      }
    } finally {
      setBusyDoc(null);
    }
  };

  const refreshInsight = async () => {
    setInsightLoading(true);
    try {
      const res = await fetch("/api/admin/analytics");
      const a = await res.json();
      setAnalytics(a.analytics ?? null);
    } finally {
      setInsightLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="space-y-4">
        <div className="grid gap-4 grid-cols-2 lg:grid-cols-5">
          {[...Array(5)].map((_, i) => (
            <div key={i} className="h-24 rounded-2xl bg-muted animate-pulse" />
          ))}
        </div>
        <div className="h-64 rounded-2xl bg-muted animate-pulse" />
      </div>
    );
  }

  const statCards = [
    { label: "Mahasiswa", value: analytics?.totalUsers ?? 0, icon: Users },
    { label: "Dokumen", value: analytics?.totalDocuments ?? 0, icon: FileStack },
    { label: "Unggahan 7 Hari", value: analytics?.docsThisWeek ?? 0, icon: TrendingUp },
    { label: "Interaksi Chat", value: analytics?.totalChats ?? 0, icon: MessageSquare },
    { label: "Rata-rata Kuis", value: analytics ? `${analytics.avgQuiz}` : "0", icon: Target },
  ];

  return (
    <div className="space-y-6">
      {/* ── Statistik platform ── */}
      <div className="grid gap-4 grid-cols-2 lg:grid-cols-5">
        {statCards.map((s, i) => (
          <motion.div
            key={s.label}
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: i * 0.04 }}
          >
            <Card className="h-full">
              <CardContent className="p-4 flex items-center gap-3">
                <div className="rounded-xl bg-primary/10 p-2">
                  <s.icon className="h-5 w-5 text-primary" />
                </div>
                <div>
                  <p className="text-xl font-bold leading-none">{s.value}</p>
                  <p className="text-xs text-muted-foreground mt-1">{s.label}</p>
                </div>
              </CardContent>
            </Card>
          </motion.div>
        ))}
      </div>

      <div className="grid gap-6 lg:grid-cols-3">
        {/* ── Tabel moderasi dokumen ── */}
        <Card className="lg:col-span-2">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-base">
              <ShieldCheck className="h-4 w-4 text-primary" /> Manajemen & Moderasi Dokumen
            </CardTitle>
          </CardHeader>
          <CardContent>
            {docs.length === 0 ? (
              <p className="text-sm text-muted-foreground text-center py-8">
                Belum ada dokumen di platform.
              </p>
            ) : (
              <div className="space-y-3 max-h-[34rem] overflow-y-auto astoria-scroll pr-1">
                {docs.map((d) => {
                  const sm = STATUS_META[d.status] ?? STATUS_META.pending;
                  return (
                    <div key={d.id} className="rounded-xl border p-4 space-y-3">
                      <div className="flex items-start justify-between gap-3">
                        <div className="min-w-0">
                          <div className="flex items-center gap-2">
                            <FileText className="h-4 w-4 shrink-0 text-primary" />
                            <p className="font-medium text-sm truncate">{d.fileName}</p>
                            <Badge variant={sm.variant} className="text-[10px] px-1.5 py-0 shrink-0">
                              <sm.icon className="h-3 w-3 mr-0.5" />
                              {sm.label}
                            </Badge>
                          </div>
                          <p className="text-xs text-muted-foreground mt-1 line-clamp-1">
                            {d.metadata?.ringkasan ?? `${d.wordCount.toLocaleString("id-ID")} kata`}
                          </p>
                          <div className="flex flex-wrap items-center gap-2 mt-1.5 text-xs text-muted-foreground">
                            <span>oleh {d.uploader}</span>
                            {d.metadata?.mata_kuliah_terkait && (
                              <>
                                <span>•</span>
                                <span>{d.metadata.mata_kuliah_terkait}</span>
                              </>
                            )}
                          </div>
                        </div>
                        <div className="flex items-center gap-1.5">
                          {busyDoc === d.id ? (
                            <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />
                          ) : (
                            <Button
                              size="icon"
                              variant="ghost"
                              className="h-8 w-8 text-muted-foreground hover:text-destructive"
                              onClick={() => removeDoc(d.id)}
                              title="Hapus dokumen"
                              aria-label="Hapus dokumen"
                            >
                              <Trash2 className="h-4 w-4" />
                            </Button>
                          )}
                        </div>
                      </div>

                      {/* Hasil Content Moderator AI */}
                      {d.moderation && (
                        <div className="rounded-lg bg-muted/60 p-3 text-xs space-y-1.5">
                          <div className="flex items-center justify-between gap-2">
                            <span className="flex items-center gap-1.5 text-muted-foreground">
                              <Sparkles className="h-3.5 w-3.5 text-amber-600 dark:text-amber-400" /> AI Content Moderator:
                            </span>
                            <Badge
                              variant={d.moderation.layak ? "default" : "destructive"}
                              className="text-[10px]"
                            >
                              Skor {d.moderation.skor_kualitas}/100
                            </Badge>
                          </div>
                          <p className="text-muted-foreground">{d.moderation.alasan}</p>
                          <div className="flex flex-wrap items-center gap-1.5">
                            <span className="text-muted-foreground">Rekomendasi AI:</span>
                            <span className="font-medium">{d.moderation.rekomendasi_admin}</span>
                            {d.moderation.tag_otomatis?.map((t) => (
                              <Badge key={t} variant="outline" className="text-[10px]">
                                #{t}
                              </Badge>
                            ))}
                          </div>
                        </div>
                      )}

                      {/* Aksi keputusan admin */}
                      <div className="flex flex-wrap gap-2 pt-1">
                        <Button
                          size="sm"
                          variant={d.status === "approved" ? "secondary" : "default"}
                          disabled={busyDoc === d.id || d.status === "approved"}
                          onClick={() => decide(d.id, "approved")}
                        >
                          <CheckCircle2 className="mr-1.5 h-3.5 w-3.5" /> Aktifkan
                        </Button>
                        <Button
                          size="sm"
                          variant="outline"
                          disabled={busyDoc === d.id || d.status === "pending"}
                          onClick={() => decide(d.id, "pending")}
                        >
                          <Clock3 className="mr-1.5 h-3.5 w-3.5" /> Review Manual
                        </Button>
                        <Button
                          size="sm"
                          variant="outline"
                          className="text-destructive hover:text-destructive"
                          disabled={busyDoc === d.id || d.status === "rejected"}
                          onClick={() => decide(d.id, "rejected")}
                        >
                          <XCircle className="mr-1.5 h-3.5 w-3.5" /> Tolak
                        </Button>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </CardContent>
        </Card>

        {/* ── Analitik & insight AI ── */}
        <div className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-base">
                <BarChart3 className="h-4 w-4 text-primary" /> Ringkasan Platform
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-3 gap-2 text-center">
                <div className="rounded-lg bg-emerald-50 dark:bg-emerald-950/40 p-2.5">
                  <p className="text-lg font-bold text-emerald-700 dark:text-emerald-400">
                    {analytics?.statusBreakdown.approved ?? 0}
                  </p>
                  <p className="text-xs text-muted-foreground">Aktif</p>
                </div>
                <div className="rounded-lg bg-amber-50 dark:bg-amber-950/40 p-2.5">
                  <p className="text-lg font-bold text-amber-700 dark:text-amber-400">
                    {analytics?.statusBreakdown.pending ?? 0}
                  </p>
                  <p className="text-xs text-muted-foreground">Review</p>
                </div>
                <div className="rounded-lg bg-red-50 dark:bg-red-950/40 p-2.5">
                  <p className="text-lg font-bold text-red-700 dark:text-red-400">
                    {analytics?.statusBreakdown.rejected ?? 0}
                  </p>
                  <p className="text-xs text-muted-foreground">Ditolak</p>
                </div>
              </div>

              {analytics && analytics.popular.length > 0 && (
                <div>
                  <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-2">
                    Dokumen terpopuler
                  </p>
                  <div className="space-y-1.5">
                    {analytics.popular.slice(0, 3).map((p, i) => (
                      <div key={p.fileName} className="flex items-center gap-2 text-sm">
                        <span className="flex h-5 w-5 items-center justify-center rounded-full bg-primary/10 text-[10px] font-bold text-primary">
                          {i + 1}
                        </span>
                        <span className="truncate flex-1">{p.fileName}</span>
                        <span className="text-xs text-muted-foreground shrink-0">
                          {p.interaksi} chat
                        </span>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {analytics && analytics.topTopics.length > 0 && (
                <div>
                  <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-2">
                    Topik sering ditanya
                  </p>
                  <div className="flex flex-wrap gap-1.5">
                    {analytics.topTopics.map((t) => (
                      <Badge key={t.kata} variant="secondary" className="text-xs">
                        {t.kata} · {t.jumlah}
                      </Badge>
                    ))}
                  </div>
                </div>
              )}
            </CardContent>
          </Card>

          {/* AI Analytics Summarizer */}
          <Card className="border-primary/30 bg-gradient-to-b from-primary/5 to-transparent">
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-base">
                <Sparkles className="h-4 w-4 text-amber-600 dark:text-amber-400" /> Insight AI
                <Button
                  size="sm"
                  variant="ghost"
                  className="ml-auto text-xs"
                  onClick={refreshInsight}
                  disabled={insightLoading}
                >
                  {insightLoading ? (
                    <Loader2 className="h-3.5 w-3.5 animate-spin" />
                  ) : (
                    "Segarkan"
                  )}
                </Button>
              </CardTitle>
            </CardHeader>
            <CardContent>
              {insightLoading ? (
                <div className="space-y-2">
                  <div className="h-3 rounded bg-muted animate-pulse" />
                  <div className="h-3 rounded bg-muted animate-pulse w-5/6" />
                  <div className="h-3 rounded bg-muted animate-pulse w-4/6" />
                </div>
              ) : analytics?.insight ? (
                <Markdown content={analytics.insight} />
              ) : (
                <p className="text-sm text-muted-foreground">
                  Insight AI akan muncul setelah ada cukup data penggunaan platform.
                </p>
              )}
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
