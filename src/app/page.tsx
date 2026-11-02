// SOBAT ADI — halaman utama (single-page app dengan 5 view)
"use client";

import { useEffect } from "react";
import { AnimatePresence, motion, useReducedMotion } from "framer-motion";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { signOut, useSession } from "next-auth/react";
import {
  GraduationCap,
  Home,
  MessagesSquare,
  UploadCloud,
  Target,
  ShieldCheck,
  Flame,
  Zap,
  Sparkles,
  Users,
  LogOut,
} from "lucide-react";
import { Progress } from "@/components/ui/progress";
import { XP_LEVELS } from "@/lib/gamif";
import { useAstoria, type ViewKey } from "@/components/astoria/store";
import { HomeView } from "@/components/astoria/home-view";
import { ChatView } from "@/components/astoria/chat-view";
import { UploadView } from "@/components/astoria/upload-view";
import { QuizView } from "@/components/astoria/quiz-view";
import { AdminView } from "@/components/astoria/admin-view";
import { AiQuotaBadge } from "@/components/astoria/ai-quota-badge";

const NAV: { key: ViewKey; label: string; icon: React.ElementType }[] = [
  { key: "beranda", label: "Beranda", icon: Home },
  { key: "mentor", label: "Mentor AI", icon: MessagesSquare },
  { key: "unggah", label: "Unggah", icon: UploadCloud },
  { key: "kuis", label: "Kuis", icon: Target },
  { key: "admin", label: "Admin", icon: ShieldCheck },
];

const XP_LEVELS_CLIENT = XP_LEVELS;

export default function AstoriaPage() {
  const { view, setView, stats } = useAstoria();
  const reduceMotion = useReducedMotion();
  const router = useRouter();
  const { data: session, status } = useSession();
  const isAdmin = session?.user?.role === "admin";

  useEffect(() => {
    if (status === "unauthenticated") router.replace("/login");
  }, [status, router]);

  useEffect(() => {
    if (status === "authenticated" && !isAdmin && view === "admin") setView("beranda");
  }, [status, isAdmin, view, setView]);

  // Progres XP untuk header
  const xp = stats?.xp ?? 0;
  const level = stats?.level ?? 1;
  const floor = XP_LEVELS_CLIENT[level - 1] ?? 0;
  const next = XP_LEVELS_CLIENT[level] ?? floor + 1000;
  const pct = Math.min(100, Math.round(((xp - floor) / (next - floor)) * 100));

  if (status !== "authenticated") {
    return (
      <div className="min-h-screen flex items-center justify-center text-sm text-muted-foreground">
        Memuat...
      </div>
    );
  }

  return (
    <div className="min-h-screen flex flex-col bg-background">
      {/* ── Header ── */}
      <header className="sticky top-0 z-50 border-b bg-background/85 backdrop-blur supports-[backdrop-filter]:bg-background/70">
        <div className="mx-auto max-w-6xl px-4">
          <div className="flex h-16 items-center justify-between gap-3">
            {/* Logo */}
            <button
              onClick={() => setView("beranda")}
              className="flex items-center gap-2.5 shrink-0"
              aria-label="SOBAT ADI — kembali ke beranda"
            >
              <div className="rounded-xl bg-gradient-to-br from-emerald-500 to-teal-700 p-2">
                <GraduationCap className="h-5 w-5 text-white" />
              </div>
              <div className="hidden sm:block text-left">
                <p className="font-bold leading-none tracking-tight">SOBAT ADI</p>
                <p className="text-[10px] text-muted-foreground leading-tight mt-0.5">
                  Belajar Tanpa Jarak
                </p>
              </div>
            </button>

            {/* Navigasi */}
            <nav className="flex items-center gap-1 overflow-x-auto astoria-scroll" aria-label="Navigasi utama">
              {NAV.filter((n) => n.key !== "admin" || isAdmin).map((n) => (
                <motion.button
                  key={n.key}
                  onClick={() => setView(n.key)}
                  whileTap={reduceMotion ? undefined : { scale: 0.96 }}
                  className={`relative isolate flex items-center gap-1.5 rounded-full px-3 py-1.5 text-sm transition-colors whitespace-nowrap ${
                    view === n.key
                      ? "text-primary-foreground"
                      : "text-muted-foreground hover:bg-muted hover:text-foreground"
                  }`}
                  aria-current={view === n.key ? "page" : undefined}
                >
                  {view === n.key && (
                    <motion.span
                      layoutId="nav-active-pill"
                      className="absolute inset-0 -z-10 rounded-full bg-primary"
                      transition={{ type: "spring", stiffness: 420, damping: 34 }}
                    />
                  )}
                  <n.icon className="h-3.5 w-3.5" />
                  <span className="hidden xs:inline sm:inline">{n.label}</span>
                </motion.button>
              ))}
            </nav>

            {/* Statistik ringkas: streak + XP */}
            <div className="hidden md:flex items-center gap-3 shrink-0">
              <AiQuotaBadge />
              <Link
                href="/collab"
                className="flex items-center gap-1.5 rounded-full px-3 py-1.5 text-sm text-muted-foreground hover:bg-muted hover:text-foreground transition-colors whitespace-nowrap"
              >
                <Users className="h-3.5 w-3.5" />
                Collab
              </Link>
              <div
                className="flex items-center gap-1.5 text-sm font-medium text-orange-600 dark:text-orange-400"
                title={`Streak belajar ${stats?.streak ?? 0} hari`}
              >
                <Flame className="h-4 w-4" />
                {stats?.streak ?? 0}
              </div>
              <div className="w-36" title={`${xp} XP — Level ${level}`}>
                <div className="flex items-center justify-between text-[10px] text-muted-foreground mb-1">
                  <span className="flex items-center gap-1">
                    <Zap className="h-3 w-3 text-amber-600 dark:text-amber-400" /> {xp} XP
                  </span>
                  <span>Lv. {level}</span>
                </div>
                <Progress value={pct} className="h-1.5" />
              </div>
            </div>

            <button
              onClick={() => signOut({ callbackUrl: "/login" })}
              className="flex items-center gap-1.5 rounded-full px-3 py-1.5 text-sm text-muted-foreground hover:bg-muted hover:text-foreground transition-colors whitespace-nowrap shrink-0"
              aria-label="Keluar"
              title={`Keluar (${session?.user?.name ?? ""})`}
            >
              <LogOut className="h-3.5 w-3.5" />
              <span className="hidden sm:inline">Keluar</span>
            </button>
          </div>
        </div>
      </header>

      {/* ── Konten ── */}
      <main className="flex-1 mx-auto w-full max-w-6xl px-4 py-6">
        <AnimatePresence mode="wait" initial={false}>
          <motion.div
            key={view}
            initial={reduceMotion ? false : { opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={reduceMotion ? { opacity: 1 } : { opacity: 0, y: -6 }}
            transition={{ duration: 0.18, ease: "easeOut" }}
          >
            {view === "beranda" && <HomeView />}
            {view === "mentor" && <ChatView />}
            {view === "unggah" && <UploadView />}
            {view === "kuis" && <QuizView />}
            {view === "admin" && isAdmin && <AdminView />}
          </motion.div>
        </AnimatePresence>
      </main>

      {/* ── Footer (sticky bottom) ── */}
      <footer className="mt-auto border-t bg-muted/40">
        <div className="mx-auto max-w-6xl px-4 py-4 flex flex-col sm:flex-row items-center justify-between gap-2 text-xs text-muted-foreground">
          <p className="flex items-center gap-1.5">
            <Sparkles className="h-3.5 w-3.5 text-primary" />
            SOBAT ADI — platform belajar bertenaga AI untuk mahasiswa PJJ Universitas Terbuka
          </p>
          <p>Mentor AI • Dokumen RAG • Gamifikasi XP • Moderasi Konten</p>
        </div>
      </footer>
    </div>
  );
}
