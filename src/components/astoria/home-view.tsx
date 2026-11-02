// Beranda — sapaan mentor proaktif (Seksi 6.3), statistik, katalog badge, aktivitas
"use client";

import { useEffect } from "react";
import { useQuery } from "@tanstack/react-query";
import { motion } from "framer-motion";
import {
  Sparkles,
  Flame,
  BookOpen,
  Zap,
  Trophy,
  Upload,
  MessageCircle,
  GraduationCap,
  Clock3,
} from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { Skeleton } from "@/components/ui/skeleton";
import { useAstoria } from "./store";

interface BadgeItem {
  name: string;
  emoji: string;
  desc: string;
  earned: boolean;
}

interface HomeData {
  greeting: string;
  waktu: string;
  profile: {
    nama: string;
    xp: number;
    level: number;
    streak: number;
    totalQuiz: number;
    avgSkor: number | null;
    docCount: number;
    xpProgress: { current: number; needed: number; pct: number };
    badges: { name: string; emoji: string; desc: string; earnedAt: string }[];
    badgeCatalog: BadgeItem[];
    recentAttempts: {
      id: string;
      soal: string;
      tingkat: string;
      dokumen: string;
      skor: number;
      xp: number;
      createdAt: string;
    }[];
  };
}

export function HomeView() {
  const { setView, setActiveDocument } = useAstoria();
  const setStats = useAstoria((s) => s.setStats);

  const greetingQuery = useQuery<{ greeting: string; waktu: string }>({
    queryKey: ["greeting"],
    queryFn: async () => {
      const res = await fetch("/api/greeting");
      if (!res.ok) throw new Error("Gagal memuat sapaan.");
      return res.json();
    },
    staleTime: 5 * 60_000,
  });

  const profileQuery = useQuery<{ profile: HomeData["profile"] }>({
    queryKey: ["profile"],
    queryFn: async () => {
      const res = await fetch("/api/profile");
      if (!res.ok) throw new Error("Gagal memuat profil.");
      return res.json();
    },
    staleTime: 60_000,
  });

  useEffect(() => {
    const p = profileQuery.data?.profile;
    if (!p) return;
    setStats({
      nama: p.nama,
      xp: p.xp,
      level: p.level,
      streak: p.streak,
      totalQuiz: p.totalQuiz,
      docCount: p.docCount,
      avgSkor: p.avgSkor,
    });
  }, [profileQuery.data, setStats]);

  if (greetingQuery.isLoading || profileQuery.isLoading) {
    return (
      <div className="space-y-4">
        <Skeleton className="h-40 w-full rounded-2xl" />
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {[...Array(4)].map((_, i) => (
            <Skeleton key={i} className="h-28 rounded-2xl" />
          ))}
        </div>
        <Skeleton className="h-64 w-full rounded-2xl" />
      </div>
    );
  }

  if (greetingQuery.isError || profileQuery.isError || !greetingQuery.data || !profileQuery.data) {
    return (
      <Card>
        <CardContent className="p-8 text-center text-muted-foreground">
          Gagal memuat beranda. Coba refresh halaman.
        </CardContent>
      </Card>
    );
  }

  const data: HomeData = {
    greeting: greetingQuery.data.greeting,
    waktu: greetingQuery.data.waktu,
    profile: profileQuery.data.profile,
  };

  const p = data.profile;

  const stats = [
    { label: "Total XP", value: p.xp, icon: Zap, color: "text-amber-700 bg-amber-100 dark:bg-amber-950" },
    { label: "Level", value: p.level, icon: GraduationCap, color: "text-emerald-700 bg-emerald-100 dark:bg-emerald-950" },
    { label: "Streak", value: `${p.streak} hari`, icon: Flame, color: "text-orange-700 bg-orange-100 dark:bg-orange-950" },
    { label: "Modul", value: p.docCount, icon: BookOpen, color: "text-teal-700 bg-teal-100 dark:bg-teal-950" },
  ];

  return (
    <div className="space-y-6">
      {/* ── Sapaan mentor proaktif (AI) ── */}
      <motion.section
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4 }}
        className="relative overflow-hidden rounded-2xl border border-emerald-800/40 bg-gradient-to-br from-emerald-700 via-emerald-800 to-teal-900 p-6 sm:p-8 text-white shadow-inner"
      >
        <div className="absolute -right-8 -top-8 opacity-10">
          <GraduationCap className="h-44 w-44" strokeWidth={1} />
        </div>
        <div className="relative">
          <div className="flex items-center gap-2 text-white font-semibold text-sm">
            <Sparkles className="h-4 w-4" />
            <span>Sapaan Mentor • {data.waktu}</span>
          </div>
          <h1 className="mt-3 text-2xl sm:text-3xl font-bold leading-snug max-w-2xl">
            {data.greeting}
          </h1>
          <p className="mt-2 text-white font-medium max-w-xl">
            Halo <strong>{p.nama}</strong>! Teruslah bertanya, menjawab kuis, dan raih lencana —
            belajar jarak jauh kini terasa dekat bersama Mentor AI SOBAT ADI.
          </p>
          <div className="mt-5 flex flex-wrap gap-3">
            <Button
              onClick={() => setView("mentor")}
              className="bg-white text-emerald-800 hover:bg-emerald-50"
            >
              <MessageCircle className="mr-2 h-4 w-4" /> Tanya Mentor AI
            </Button>
            <Button
              variant="outline"
              onClick={() => setView("unggah")}
              className="border-white/60 bg-transparent text-white shadow-none hover:bg-white/15 hover:text-white"
            >
              <Upload className="mr-2 h-4 w-4" /> Unggah Modul
            </Button>
          </div>
        </div>
      </motion.section>

      {/* ── Statistik ringkas ── */}
      <div className="grid gap-4 grid-cols-2 lg:grid-cols-4">
        {stats.map((s, i) => (
          <motion.div
            key={s.label}
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.05 * i, duration: 0.3 }}
          >
            <Card className="h-full">
              <CardContent className="p-4 sm:p-5 flex items-center gap-4">
                <div className={`rounded-xl p-2.5 ${s.color}`}>
                  <s.icon className="h-5 w-5" />
                </div>
                <div>
                  <p className="text-2xl font-bold leading-none">{s.value}</p>
                  <p className="text-xs text-muted-foreground mt-1">{s.label}</p>
                </div>
              </CardContent>
            </Card>
          </motion.div>
        ))}
      </div>

      <div className="grid gap-6 lg:grid-cols-3">
        {/* ── Progress level ── */}
        <Card className="lg:col-span-2">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-base">
              <Zap className="h-4 w-4 text-amber-600 dark:text-amber-400" /> Progres Level {p.level}
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <div className="flex justify-between text-sm mb-2">
                <span className="text-muted-foreground">
                  {p.xpProgress.current} / {p.xpProgress.needed} XP menuju Level {p.level + 1}
                </span>
                <span className="font-semibold">{p.xpProgress.pct}%</span>
              </div>
              <Progress value={p.xpProgress.pct} className="h-3" />
            </div>

            {/* Katalog badge */}
            <div>
              <p className="text-sm font-semibold mb-3 flex items-center gap-2">
                <Trophy className="h-4 w-4 text-amber-600 dark:text-amber-400" /> Lencana ({p.badgeCatalog.filter((b) => b.earned).length}/4)
              </p>
              <div className="grid gap-2 sm:grid-cols-2">
                {p.badgeCatalog.map((b) => (
                  <div
                    key={b.name}
                    className={`flex items-start gap-3 rounded-xl border p-3 transition-colors ${
                      b.earned
                        ? "border-amber-300 bg-amber-50 dark:bg-amber-950/40 dark:border-amber-800"
                        : "border-dashed opacity-70"
                    }`}
                  >
                    <span className={`text-2xl ${b.earned ? "" : "grayscale opacity-50"}`}>{b.emoji}</span>
                    <div className="min-w-0">
                      <p className="font-medium text-sm leading-tight">{b.name}</p>
                      <p className="text-xs text-muted-foreground mt-0.5">{b.desc}</p>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </CardContent>
        </Card>

        {/* ── Aktivitas kuis terakhir ── */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-base">
              <Clock3 className="h-4 w-4 text-muted-foreground" /> Aktivitas Terakhir
            </CardTitle>
          </CardHeader>
          <CardContent>
            {p.recentAttempts.length === 0 ? (
              <div className="text-center py-8 text-sm text-muted-foreground">
                <p>Belum ada aktivitas kuis.</p>
                <Button
                  variant="outline"
                  size="sm"
                  className="mt-3"
                  onClick={() => {
                    setView("kuis");
                  }}
                >
                  Coba kuis pertama 🎯
                </Button>
              </div>
            ) : (
              <div className="space-y-3 max-h-80 overflow-y-auto astoria-scroll pr-1">
                {p.recentAttempts.slice(0, 6).map((a) => (
                  <div key={a.id} className="flex items-start gap-3 text-sm border-b pb-3 last:border-0 last:pb-0">
                    <Badge
                      variant={a.skor >= 70 ? "default" : a.skor >= 40 ? "secondary" : "destructive"}
                      className="mt-0.5 shrink-0"
                    >
                      {a.skor}
                    </Badge>
                    <div className="min-w-0">
                      <p className="line-clamp-2 leading-snug">{a.soal}</p>
                      <p className="text-xs text-muted-foreground mt-1">
                        {a.dokumen} · +{a.xp} XP
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
