// Kuis & Gamifikasi (Seksi 6 spesifikasi):
// - Generate soal dari dokumen
// - AI Quiz Evaluator: skor, XP, feedback, koreksi
// - Animasi: XP bar, toast badge, confetti level naik
"use client";

import { useCallback, useEffect, useState } from "react";
import { motion } from "framer-motion";
import {
  Target,
  FileText,
  Loader2,
  Sparkles,
  SendHorizonal,
  Trophy,
  Flame,
  CheckCircle2,
  AlertCircle,
  RotateCcw,
} from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";
import { Progress } from "@/components/ui/progress";
import { useToast } from "@/hooks/use-toast";
import { useAstoria } from "./store";
import { Confetti } from "./confetti";

interface DocItem {
  id: string;
  fileName: string;
  status: string;
  metadata: { estimasi_tingkat_kesulitan?: string } | null;
}

interface Question {
  id: string;
  soal: string;
  tingkat: string;
}

interface AnswerResult {
  attemptId: string;
  skor: number;
  xpDiperoleh: number;
  badgeBaru: string | null;
  badgeEmoji: string | null;
  feedback: string;
  koreksi: string;
  levelNaik: boolean;
  newLevel: number;
  totalXp: number;
  kunci: string | null;
}

export function QuizView() {
  const { toast } = useToast();
  const { activeDocumentId, setActiveDocument, refreshStats } = useAstoria();
  const [docs, setDocs] = useState<DocItem[]>([]);
  const [questions, setQuestions] = useState<Question[]>([]);
  const [answers, setAnswers] = useState<Record<string, string>>({});
  const [results, setResults] = useState<Record<string, AnswerResult>>({});
  const [generating, setGenerating] = useState(false);
  const [submitting, setSubmitting] = useState<string | null>(null);
  const [showConfetti, setShowConfetti] = useState(false);
  const doneConfetti = useCallback(() => setShowConfetti(false), []);

  useEffect(() => {
    (async () => {
      const res = await fetch("/api/documents");
      const data = await res.json();
      const list: DocItem[] = (data.documents ?? []).filter(
        (d: DocItem & { status: string }) => d.status !== "rejected"
      );
      setDocs(list);
    })();
  }, []);

  const generate = async () => {
    if (!activeDocumentId) {
      toast({ title: "Pilih dokumen dulu ya!", variant: "destructive" });
      return;
    }
    setGenerating(true);
    setQuestions([]);
    setAnswers({});
    setResults({});
    try {
      const res = await fetch("/api/quiz/generate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ documentId: activeDocumentId }),
      });
      const data = await res.json();
      if (!res.ok) {
        toast({ title: "Gagal membuat kuis", description: data.error, variant: "destructive" });
        return;
      }
      setQuestions(data.questions);
      toast({ title: "Kuis siap! 🎯", description: `${data.questions.length} soal berhasil dibuat dari dokumen.` });
    } catch {
      toast({ title: "Gagal membuat kuis", variant: "destructive" });
    } finally {
      setGenerating(false);
    }
  };

  const submitAnswer = async (q: Question) => {
    const jawaban = (answers[q.id] ?? "").trim();
    if (!jawaban) {
      toast({ title: "Tulis jawabanmu dulu ya!", variant: "destructive" });
      return;
    }
    setSubmitting(q.id);
    try {
      const res = await fetch("/api/quiz/submit", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ questionId: q.id, jawaban }),
      });
      const data = await res.json();
      if (!res.ok) {
        toast({ title: "Gagal mengevaluasi", description: data.error, variant: "destructive" });
        return;
      }
      const r: AnswerResult = data.result;
      setResults((prev) => ({ ...prev, [q.id]: r }));
      refreshStats();

      // Animasi sesuai spesifikasi 6.2: toast badge + confetti level naik
      if (r.badgeBaru) {
        toast({
          title: `${r.badgeEmoji ?? "🏅"} Lencana baru: ${r.badgeBaru}!`,
          description: "Kerja hebat — lencana ini baru saja kamu raih!",
        });
      }
      if (r.levelNaik) {
        setShowConfetti(true);
        toast({
          title: `🎉 Naik ke Level ${r.newLevel}!`,
          description: "Teruskan semangat belajarmu!",
        });
      }
    } catch {
      toast({ title: "Gagal mengevaluasi", variant: "destructive" });
    } finally {
      setSubmitting(null);
    }
  };

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      {showConfetti && <Confetti onDone={doneConfetti} />}

      {/* ── Pilih dokumen & generate ── */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-base">
            <Target className="h-4 w-4 text-primary" /> Uji Pemahaman Modul
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {docs.length === 0 ? (
            <p className="text-sm text-muted-foreground text-center py-4">
              Unggah modul dulu di tab Unggah untuk mulai bermain kuis.
            </p>
          ) : (
            <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
              {docs.map((d) => (
                <button
                  key={d.id}
                  onClick={() => {
                    setActiveDocument(d.id);
                    setQuestions([]);
                    setResults({});
                  }}
                  className={`text-left rounded-xl border p-3 transition-all hover:border-primary/50 ${
                    activeDocumentId === d.id
                      ? "border-primary bg-primary/5 ring-1 ring-primary/30"
                      : "border-border"
                  }`}
                >
                  <div className="flex items-center gap-2">
                    <FileText className="h-4 w-4 shrink-0 text-primary" />
                    <p className="text-sm font-medium truncate">{d.fileName}</p>
                  </div>
                  <p className="text-xs text-muted-foreground mt-1">
                    {d.metadata?.estimasi_tingkat_kesulitan ?? "Tingkat menengah"}
                  </p>
                </button>
              ))}
            </div>
          )}

          <div className="flex flex-wrap gap-2">
            <Button onClick={generate} disabled={generating || !activeDocumentId}>
              {generating ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" /> Menyusun soal…
                </>
              ) : (
                <>
                  <Sparkles className="mr-2 h-4 w-4" /> {questions.length > 0 ? "Buat Kuis Baru" : "Buat Kuis"}
                </>
              )}
            </Button>
            {questions.length > 0 && (
              <Button
                variant="outline"
                onClick={() => {
                  setQuestions([]);
                  setAnswers({});
                  setResults({});
                }}
              >
                <RotateCcw className="mr-2 h-4 w-4" /> Reset
              </Button>
            )}
          </div>
        </CardContent>
      </Card>

      {/* ── Daftar soal ── */}
      {generating && (
        <Card>
          <CardContent className="p-6 space-y-3">
            <div className="flex items-center gap-3 text-sm">
              <Loader2 className="h-4 w-4 animate-spin text-primary" />
              AI sedang menyusun 5 soal dari dokumen terpilih…
            </div>
            {[...Array(3)].map((_, i) => (
              <div key={i} className="h-16 rounded-xl bg-muted animate-pulse" />
            ))}
          </CardContent>
        </Card>
      )}

      {questions.map((q, idx) => {
        const r = results[q.id];
        const answered = !!r;
        return (
          <motion.div
            key={q.id}
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: idx * 0.06 }}
          >
            <Card className={answered ? (r.skor >= 60 ? "border-emerald-300 dark:border-emerald-800" : "border-amber-300 dark:border-amber-800") : ""}>
              <CardContent className="p-5 space-y-4">
                <div className="flex items-start justify-between gap-3">
                  <div className="flex gap-3">
                    <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-primary/10 text-sm font-bold text-primary">
                      {idx + 1}
                    </span>
                    <p className="font-medium leading-relaxed">{q.soal}</p>
                  </div>
                  <Badge
                    variant={q.tingkat === "Lanjut" ? "destructive" : q.tingkat === "Menengah" ? "secondary" : "outline"}
                    className="shrink-0"
                  >
                    {q.tingkat}
                  </Badge>
                </div>

                {!answered ? (
                  <>
                    <Textarea
                      placeholder="Tulis jawabanmu dengan bahasamu sendiri…"
                      value={answers[q.id] ?? ""}
                      onChange={(e) => setAnswers((a) => ({ ...a, [q.id]: e.target.value }))}
                      rows={3}
                      className="resize-y"
                    />
                    <Button
                      size="sm"
                      onClick={() => submitAnswer(q)}
                      disabled={submitting === q.id}
                    >
                      {submitting === q.id ? (
                        <>
                          <Loader2 className="mr-2 h-4 w-4 animate-spin" /> Mengevaluasi…
                        </>
                      ) : (
                        <>
                          <SendHorizonal className="mr-2 h-4 w-4" /> Kirim Jawaban
                        </>
                      )}
                    </Button>
                  </>
                ) : (
                  <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="space-y-3">
                    {/* Skor & XP */}
                    <div className="flex flex-wrap items-center gap-3">
                      <Badge
                        className={`text-sm px-2.5 py-1 ${
                          r.skor >= 70
                            ? ""
                            : r.skor >= 40
                              ? "bg-amber-400 text-amber-950 hover:bg-amber-400"
                              : "bg-red-600 hover:bg-red-600"
                        }`}
                      >
                        Skor {r.skor}
                      </Badge>
                      <span className="flex items-center gap-1 text-sm font-semibold text-amber-600 dark:text-amber-400">
                        <Trophy className="h-4 w-4" /> +{r.xpDiperoleh} XP
                      </span>
                      <Progress value={r.skor} className="h-2 flex-1 min-w-24" />
                    </div>

                    {/* Feedback motivasional */}
                    <div className="rounded-xl bg-muted/70 p-3.5">
                      <p className="text-sm flex items-start gap-2">
                        <Sparkles className="h-4 w-4 mt-0.5 shrink-0 text-amber-600 dark:text-amber-400" />
                        <span>{r.feedback}</span>
                      </p>
                    </div>

                    {/* Koreksi (warna berbeda sesuai spesifikasi 6.2) */}
                    {r.koreksi && (
                      <div className="rounded-xl border border-amber-200 bg-amber-50 dark:bg-amber-950/30 dark:border-amber-800 p-3.5">
                        <p className="text-sm flex items-start gap-2">
                          <AlertCircle className="h-4 w-4 mt-0.5 shrink-0 text-amber-600" />
                          <span>
                            <strong className="block mb-0.5">Koreksi:</strong>
                            {r.koreksi}
                          </span>
                        </p>
                      </div>
                    )}

                    {/* Kunci jawaban untuk skor rendah */}
                    {r.kunci && r.skor < 60 && (
                      <div className="rounded-xl border border-emerald-200 bg-emerald-50 dark:bg-emerald-950/30 dark:border-emerald-800 p-3.5">
                        <p className="text-sm flex items-start gap-2">
                          <CheckCircle2 className="h-4 w-4 mt-0.5 shrink-0 text-emerald-600" />
                          <span>
                            <strong className="block mb-0.5">Kunci jawaban:</strong>
                            {r.kunci}
                          </span>
                        </p>
                      </div>
                    )}

                    <div className="flex items-center gap-2 text-xs text-muted-foreground">
                      <Flame className="h-3.5 w-3.5 text-orange-600 dark:text-orange-400" />
                      Total XP kamu sekarang: {r.totalXp} XP
                    </div>
                  </motion.div>
                )}
              </CardContent>
            </Card>
          </motion.div>
        );
      })}

      {questions.length > 0 && Object.keys(results).length === questions.length && (
        <motion.div initial={{ scale: 0.95, opacity: 0 }} animate={{ scale: 1, opacity: 1 }}>
          <Card className="bg-gradient-to-r from-emerald-700 to-teal-800 text-white border-0">
            <CardContent className="p-6 text-center">
              <Trophy className="h-10 w-10 mx-auto text-amber-200" />
              <h3 className="mt-3 text-xl font-bold">
                Semua soal selesai! 🎉
              </h3>
              <p className="mt-1 text-white font-medium">
                Kamu menjawab {questions.length} soal dan mengumpulkan{" "}
                {Object.values(results).reduce((a, b) => a + b.xpDiperoleh, 0)} XP dari sesi ini.
                Tanya Mentor AI untuk memperdalam materi, atau coba dokumen lain!
              </p>
            </CardContent>
          </Card>
        </motion.div>
      )}
    </div>
  );
}
