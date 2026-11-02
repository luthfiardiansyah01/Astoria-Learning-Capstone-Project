// Mentor AI — RAG Chat (Seksi 3 spesifikasi)
// Mahasiswa memilih dokumen → retrieval → jawaban bersitasi + fallback ramah
"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { motion } from "framer-motion";
import {
  BookOpen,
  FileText,
  Send,
  Trash2,
  GraduationCap,
  FileQuestion,
  Bot,
  User as UserIcon,
  Loader2,
} from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";
import { ScrollArea } from "@/components/ui/scroll-area";
import { useToast } from "@/hooks/use-toast";
import { useAstoria } from "./store";
import { Markdown } from "./markdown";
import { RealtimeClock } from "./realtime-clock";
import { ElapsedTimer } from "./elapsed-timer";

interface DocItem {
  id: string;
  fileName: string;
  wordCount: number;
  status: string;
  metadata: { ringkasan: string; mata_kuliah_terkait: string } | null;
}

interface Message {
  role: "user" | "assistant";
  content: string;
  createdAt?: string;
  durationMs?: number;
}

const wibTime = new Intl.DateTimeFormat("id-ID", {
  timeZone: "Asia/Jakarta",
  hour: "2-digit",
  minute: "2-digit",
  second: "2-digit",
  hour12: false,
});

function formatWib(iso?: string) {
  if (!iso) return null;
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return null;
  return wibTime.format(date);
}

export function ChatView() {
  const { setView, activeDocumentId, setActiveDocument } = useAstoria();
  const { toast } = useToast();
  const [docs, setDocs] = useState<DocItem[]>([]);
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState("");
  const [sending, setSending] = useState(false);
  const [loadingDocs, setLoadingDocs] = useState(true);
  const scrollRef = useRef<HTMLDivElement>(null);

  const activeDoc = docs.find((d) => d.id === activeDocumentId) ?? null;

  // Muat daftar dokumen
  useEffect(() => {
    (async () => {
      try {
        const res = await fetch("/api/documents");
        const data = await res.json();
        const list: DocItem[] = (data.documents ?? []).filter(
          (d: DocItem & { status: string }) => d.status !== "rejected"
        );
        setDocs(list);
        // Auto-pilih dokumen aktif pertama kali
        if (!activeDocumentId && list.length > 0) {
          setActiveDocument(list[0].id);
        }
      } catch {
        toast({ title: "Gagal memuat dokumen", variant: "destructive" });
      } finally {
        setLoadingDocs(false);
      }
    })();
  }, []);

  // Muat riwayat chat saat ganti dokumen
  useEffect(() => {
    if (!activeDocumentId) {
      setMessages([]);
      return;
    }
    (async () => {
      try {
        const res = await fetch(`/api/chat?documentId=${activeDocumentId}`);
        const data = await res.json();
        setMessages(data.messages ?? []);
      } catch {
        setMessages([]);
      }
    })();
  }, [activeDocumentId]);

  useEffect(() => {
    scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight, behavior: "smooth" });
  }, [messages, sending]);

  const send = useCallback(async () => {
    const question = input.trim();
    if (question.length < 3) {
      toast({
        title: "Pertanyaan terlalu pendek",
        description: "Tulis minimal 3 karakter ya 😊",
        variant: "destructive",
      });
      return;
    }
    if (question.length > 800) {
      toast({ title: "Pertanyaan kepanjangan", description: "Maksimal 800 karakter." });
      return;
    }

    setInput("");
    const askedAt = new Date();
    const startedAt = Date.now();
    setMessages((m) => [
      ...m,
      { role: "user", content: question, createdAt: askedAt.toISOString() },
    ]);
    setSending(true);

    try {
      const res = await fetch("/api/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ documentId: activeDocumentId, question }),
      });
      const data = await res.json();
      const finishedAt = Date.now();
      setMessages((m) => [
        ...m,
        {
          role: "assistant",
          content: data.reply ?? data.error ?? "Terjadi kesalahan.",
          createdAt: new Date(finishedAt).toISOString(),
          durationMs: finishedAt - startedAt,
        },
      ]);
    } catch {
      const finishedAt = Date.now();
      setMessages((m) => [
        ...m,
        {
          role: "assistant",
          content:
            "Mentor AI sedang istirahat sebentar 😅. Coba lagi dalam beberapa detik. Jika masalah berlanjut, refresh halaman.",
          createdAt: new Date(finishedAt).toISOString(),
          durationMs: finishedAt - startedAt,
        },
      ]);
    } finally {
      setSending(false);
    }
  }, [input, activeDocumentId, toast]);

  const clearChat = async () => {
    if (!activeDocumentId) return;
    await fetch(`/api/chat?documentId=${activeDocumentId}`, { method: "DELETE" });
    setMessages([]);
    toast({ title: "Riwayat chat dibersihkan 🧹" });
  };

  return (
    <div className="grid gap-4 lg:grid-cols-[280px_1fr] min-h-[calc(100vh-13rem)]">
      {/* ── Panel dokumen ── */}
      <Card className="h-fit lg:sticky lg:top-24">
        <CardContent className="p-4">
          <div className="flex items-center justify-between mb-3">
            <p className="font-semibold text-sm flex items-center gap-2">
              <BookOpen className="h-4 w-4 text-primary" /> Dokumen Modul
            </p>
            <Button size="sm" variant="outline" onClick={() => setView("unggah")}>
              <FileText className="h-3.5 w-3.5 mr-1" /> Unggah
            </Button>
          </div>

          {loadingDocs ? (
            <div className="space-y-2">
              {[...Array(3)].map((_, i) => (
                <div key={i} className="h-16 rounded-xl bg-muted animate-pulse" />
              ))}
            </div>
          ) : docs.length === 0 ? (
            <div className="text-center py-8 px-2">
              <FileQuestion className="h-10 w-10 mx-auto text-muted-foreground/50" />
              <p className="text-sm text-muted-foreground mt-3">
                Belum ada dokumen. Upload modul kamu dulu untuk mulai bertanya!
              </p>
              <Button size="sm" className="mt-3" onClick={() => setView("unggah")}>
                📤 Unggah Dokumen
              </Button>
            </div>
          ) : (
            <div className="space-y-2 max-h-[26rem] overflow-y-auto astoria-scroll pr-1">
              {docs.map((d) => (
                <button
                  key={d.id}
                  onClick={() => setActiveDocument(d.id)}
                  className={`w-full text-left rounded-xl border p-3 transition-all hover:border-primary/50 ${
                    activeDocumentId === d.id
                      ? "border-primary bg-primary/5 ring-1 ring-primary/30"
                      : "border-border"
                  }`}
                >
                  <div className="flex items-center gap-2">
                    <FileText className="h-4 w-4 shrink-0 text-primary" />
                    <p className="text-sm font-medium truncate">{d.fileName}</p>
                  </div>
                  <p className="text-xs text-muted-foreground mt-1.5 line-clamp-2">
                    {d.metadata?.ringkasan ?? `${d.wordCount.toLocaleString("id-ID")} kata`}
                  </p>
                  <div className="flex items-center gap-2 mt-2">
                    <Badge
                      variant={d.status === "approved" ? "default" : "secondary"}
                      className="text-[10px] px-1.5 py-0"
                    >
                      {d.status === "approved" ? "Aktif" : "Review"}
                    </Badge>
                    <span className="text-[10px] text-muted-foreground">
                      {d.wordCount.toLocaleString("id-ID")} kata
                    </span>
                  </div>
                </button>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* ── Area chat ── */}
      <Card className="flex flex-col min-h-[32rem]">
        <div className="flex items-center justify-between border-b px-4 py-3">
          <div className="flex items-center gap-2.5 min-w-0">
            <div className="rounded-full bg-primary/10 p-2">
              <GraduationCap className="h-5 w-5 text-primary" />
            </div>
            <div className="min-w-0">
              <p className="font-semibold text-sm leading-tight">Mentor AI SOBAT ADI</p>
              <p className="text-xs text-muted-foreground truncate">
                {activeDoc ? `Aktif: ${activeDoc.fileName}` : "Pilih dokumen di panel kiri"}
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2 shrink-0">
            <RealtimeClock className="hidden sm:inline text-[11px] text-muted-foreground" />
            {activeDocumentId && messages.length > 0 && (
              <Button size="sm" variant="ghost" onClick={clearChat} title="Bersihkan riwayat">
                <Trash2 className="h-4 w-4" />
              </Button>
            )}
          </div>
        </div>

        <div ref={scrollRef} className="flex-1 overflow-y-auto p-4 space-y-4 astoria-scroll">
          {messages.length === 0 && !sending && (
            <div className="h-full flex items-center justify-center">
              <div className="text-center max-w-md px-4 py-10">
                <Bot className="h-14 w-14 mx-auto text-primary/40" />
                <h3 className="mt-4 font-semibold">
                  {activeDoc ? "Siap membantu! 👋" : "Halo, mahasiswa hebat! 👋"}
                </h3>
                <p className="text-sm text-muted-foreground mt-2">
                  {activeDoc
                    ? "Tanya apa saja tentang isi modul ini. Jawabanku selalu bersumber dari dokumen, lengkap dengan referensi bagian."
                    : "Pilih dokumen modul di panel kiri, atau unggah modul baru. Aku hanya menjawab berdasarkan dokumen yang kamu unggah — akurat dan bersitasi."}
                </p>
                {activeDoc && (
                  <div className="mt-5 grid gap-2">
                    {[
                      "Jelaskan ringkas isi modul ini",
                      "Apa poin terpenting yang harus aku pahami?",
                      "Buatkan analogi sederhana untuk konsep utamanya",
                    ].map((c) => (
                      <button
                        key={c}
                        onClick={() => setInput(c)}
                        className="text-sm rounded-xl border border-dashed px-4 py-2.5 hover:border-primary hover:bg-primary/5 transition-colors"
                      >
                        {c}
                      </button>
                    ))}
                  </div>
                )}
              </div>
            </div>
          )}

          {messages.map((m, i) => {
            const prev = messages[i - 1];
            const answerMs =
              m.durationMs ??
              (m.role === "assistant" && prev?.role === "user" && prev.createdAt && m.createdAt
                ? new Date(m.createdAt).getTime() - new Date(prev.createdAt).getTime()
                : null);
            const sentAt = formatWib(m.createdAt);

            return (
              <motion.div
                key={i}
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                className={`flex gap-3 ${m.role === "user" ? "justify-end" : ""}`}
              >
                {m.role === "assistant" && (
                  <div className="rounded-full bg-primary/10 p-2 h-9 w-9 shrink-0">
                    <GraduationCap className="h-5 w-5 text-primary" />
                  </div>
                )}
                <div
                  className={`rounded-2xl px-4 py-3 max-w-[85%] sm:max-w-[78%] ${
                    m.role === "user"
                      ? "bg-primary text-primary-foreground rounded-br-md"
                      : "bg-muted rounded-bl-md"
                  }`}
                >
                  {m.role === "assistant" ? (
                    <Markdown content={m.content} />
                  ) : (
                    <p className="text-sm whitespace-pre-wrap">{m.content}</p>
                  )}
                  {sentAt && (
                    <p
                      className={`mt-1 text-[10px] ${
                        m.role === "user"
                          ? "text-right text-primary-foreground/75"
                          : "text-muted-foreground"
                      }`}
                    >
                      {m.role === "user" ? "Dikirim" : "Dijawab"} {sentAt} WIB
                      {m.role === "assistant" && answerMs != null && answerMs >= 0
                        ? ` • ${(answerMs / 1000).toFixed(1).replace(".", ",")} dtk`
                        : ""}
                    </p>
                  )}
                </div>
                {m.role === "user" && (
                  <div className="rounded-full bg-secondary border p-2 h-9 w-9 shrink-0">
                    <UserIcon className="h-5 w-5 text-secondary-foreground" />
                  </div>
                )}
              </motion.div>
            );
          })}

          {sending && (
            <div className="flex gap-3">
              <div className="rounded-full bg-primary/10 p-2 h-9 w-9 shrink-0">
                <GraduationCap className="h-5 w-5 text-primary" />
              </div>
              <div className="rounded-2xl rounded-bl-md bg-muted px-4 py-3.5 flex items-center gap-1.5">
                <span className="typing-dot h-2 w-2 rounded-full bg-primary inline-block" />
                <span className="typing-dot h-2 w-2 rounded-full bg-primary inline-block" />
                <span className="typing-dot h-2 w-2 rounded-full bg-primary inline-block" />
                <ElapsedTimer
                  prefix="Mentor membaca modul"
                  className="text-xs text-muted-foreground ml-2"
                />
              </div>
            </div>
          )}
        </div>

        <div className="border-t p-3 sm:p-4">
          <div className="flex gap-2">
            <Textarea
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter" && !e.shiftKey) {
                  e.preventDefault();
                  send();
                }
              }}
              placeholder={
                activeDoc
                  ? "Tulis pertanyaanmu tentang modul… (Enter untuk kirim)"
                  : "Pilih dokumen dulu ya…"
              }
              rows={2}
              disabled={sending || !activeDoc}
              className="resize-none"
            />
            <Button onClick={send} disabled={sending || !activeDoc} className="px-4" aria-label="Kirim pertanyaan">
              {sending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
            </Button>
          </div>
          <p className="text-[11px] text-muted-foreground mt-2 px-1">
            Mentor AI hanya menjawab berdasarkan isi dokumen terpilih — tidak mengarang informasi.
          </p>
        </div>
      </Card>
    </div>
  );
}
