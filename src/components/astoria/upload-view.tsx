// Unggah Dokumen — pemrosesan dokumen (Seksi 4) + status moderasi (Seksi 5.1)
"use client";

import { useRef, useState } from "react";
import { motion } from "framer-motion";
import {
  UploadCloud,
  FileText,
  ClipboardPaste,
  Loader2,
  CheckCircle2,
  XCircle,
  BookMarked,
  Tags,
  BarChart3,
  Lightbulb,
  ShieldCheck,
} from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";
import { Input } from "@/components/ui/input";
import { useToast } from "@/hooks/use-toast";
import { useAstoria } from "./store";

interface UploadResult {
  document: {
    id: string;
    fileName: string;
    wordCount: number;
    status: string;
    chunkCount: number;
    metadata: {
      judul_dokumen: string;
      ringkasan: string;
      topik_utama: string[];
      struktur: { bab: string; judul: string; subtopik: string[] }[];
      kata_kunci: string[];
      estimasi_tingkat_kesulitan: string;
      mata_kuliah_terkait: string;
    } | null;
    moderation: {
      layak: boolean;
      skor_kualitas: number;
      alasan: string;
      tag_otomatis: string[];
      rekomendasi_admin: string;
    } | null;
  };
}

export function UploadView() {
  const { toast } = useToast();
  const { setActiveDocument, setView } = useAstoria();
  const [fileName, setFileName] = useState("");
  const [content, setContent] = useState("");
  const [processing, setProcessing] = useState(false);
  const [result, setResult] = useState<UploadResult["document"] | null>(null);
  const [dragOver, setDragOver] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const charCount = content.length;

  const readFile = (file: File) => {
    if (file.size > 2 * 1024 * 1024) {
      toast({
        title: "File terlalu besar",
        description: "Maksimal 2 MB untuk file teks. Coba potong per bab ya!",
        variant: "destructive",
      });
      return;
    }
    const reader = new FileReader();
    reader.onload = () => {
      setFileName(file.name);
      setContent(String(reader.result ?? ""));
      setResult(null);
    };
    reader.readAsText(file);
  };

  const submit = async () => {
    if (!content.trim()) {
      toast({
        title: "Konten masih kosong",
        description: "Pilih file .txt/.md atau tempel teks modul kamu dulu ya!",
        variant: "destructive",
      });
      return;
    }
    setProcessing(true);
    setResult(null);
    try {
      const res = await fetch("/api/documents", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ fileName: fileName || "modul-tempel.txt", content }),
      });
      const data = await res.json();
      if (!res.ok) {
        toast({ title: "Gagal memproses", description: data.error, variant: "destructive" });
        return;
      }
      setResult(data.document);
      setActiveDocument(data.document.id);
      toast({
        title: "Dokumen berhasil diproses! 🎉",
        description: `Struktur diekstrak • ${data.document.chunkCount} potongan terindeks`,
      });
    } catch {
      toast({ title: "Gagal mengunggah", description: "Coba lagi beberapa saat.", variant: "destructive" });
    } finally {
      setProcessing(false);
    }
  };

  return (
    <div className="grid gap-6 lg:grid-cols-5 max-w-6xl mx-auto">
      {/* ── Formulir unggah ── */}
      <div className="lg:col-span-3 space-y-4">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-base">
              <UploadCloud className="h-4 w-4 text-primary" /> Unggah Modul Kuliah
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {/* Dropzone */}
            <div
              role="button"
              tabIndex={0}
              aria-label="Zona unggah file"
              onClick={() => fileInputRef.current?.click()}
              onKeyDown={(e) => e.key === "Enter" && fileInputRef.current?.click()}
              onDragOver={(e) => {
                e.preventDefault();
                setDragOver(true);
              }}
              onDragLeave={() => setDragOver(false)}
              onDrop={(e) => {
                e.preventDefault();
                setDragOver(false);
                const file = e.dataTransfer.files?.[0];
                if (file) readFile(file);
              }}
              className={`rounded-2xl border-2 border-dashed p-8 text-center cursor-pointer transition-colors ${
                dragOver ? "border-primary bg-primary/5" : "border-border hover:border-primary/50"
              }`}
            >
              <UploadCloud className="h-10 w-10 mx-auto text-muted-foreground/60" />
              <p className="mt-3 font-medium">Tarik & lepas file, atau klik untuk memilih</p>
              <p className="text-sm text-muted-foreground mt-1">
                Format .txt atau .md (maks 50.000 karakter)
              </p>
              <input
                ref={fileInputRef}
                type="file"
                accept=".txt,.md,.markdown,text/plain"
                className="sr-only"
                onChange={(e) => {
                  const f = e.target.files?.[0];
                  if (f) readFile(f);
                }}
              />
            </div>

            <div className="grid gap-2">
              <Input
                placeholder="Nama dokumen (mis. modul-sim-bab4.txt)"
                value={fileName}
                onChange={(e) => setFileName(e.target.value)}
              />
              <div className="relative">
                <Textarea
                  placeholder="…atau tempel isi modul di sini, lalu klik Proses Dokumen"
                  value={content}
                  onChange={(e) => {
                    setContent(e.target.value);
                    setResult(null);
                  }}
                  rows={9}
                  className="resize-y"
                />
                <span
                  className={`absolute bottom-2 right-3 text-[11px] ${
                    charCount > 50000 ? "text-destructive font-semibold" : "text-muted-foreground"
                  }`}
                >
                  {charCount.toLocaleString("id-ID")} / 50.000 karakter
                </span>
              </div>
            </div>

            <div className="flex flex-wrap gap-2">
              <Button onClick={submit} disabled={processing || !content.trim()}>
                {processing ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" /> Menganalisis dokumen…
                  </>
                ) : (
                  <>
                    <ClipboardPaste className="mr-2 h-4 w-4" /> Proses Dokumen
                  </>
                )}
              </Button>
              {result && (
                <Button variant="outline" onClick={() => setView("mentor")}>
                  Tanya Mentor tentang dokumen ini →
                </Button>
              )}
            </div>
          </CardContent>
        </Card>

        {/* Info alur */}
        <Card className="border-dashed">
          <CardContent className="p-4 text-sm text-muted-foreground space-y-1.5">
            <p className="font-medium text-foreground flex items-center gap-2">
              <Lightbulb className="h-4 w-4 text-amber-500" /> Apa yang terjadi setelah unggah?
            </p>
            <p>
              1. Dokumen dipecah menjadi potongan (chunk) untuk pencarian jawaban RAG.
              2. AI mengekstrak struktur: bab, topik, kata kunci, mata kuliah terkait.
              3. Content Moderator menilai kelayakan dokumen secara otomatis.
            </p>
          </CardContent>
        </Card>
      </div>

      {/* ── Hasil ekstraksi + moderasi ── */}
      <div className="lg:col-span-2 space-y-4">
        {processing && (
          <Card>
            <CardContent className="p-6 space-y-4">
              <div className="flex items-center gap-3 text-sm">
                <Loader2 className="h-4 w-4 animate-spin text-primary" />
                <span>AI sedang menganalisis struktur dokumen…</span>
              </div>
              <div className="space-y-2">
                <div className="h-4 rounded bg-muted animate-pulse" />
                <div className="h-4 rounded bg-muted animate-pulse w-5/6" />
                <div className="h-4 rounded bg-muted animate-pulse w-4/6" />
              </div>
            </CardContent>
          </Card>
        )}

        {result && !processing && (
          <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="space-y-4">
            {/* Status moderasi */}
            <Card className={
              result.status === "approved"
                ? "border-emerald-300 dark:border-emerald-800"
                : result.status === "rejected"
                  ? "border-red-300 dark:border-red-800"
                  : ""
            }>
              <CardHeader className="pb-2">
                <CardTitle className="flex items-center gap-2 text-base">
                  <ShieldCheck className="h-4 w-4 text-primary" /> Status Moderasi
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                <div className="flex items-center gap-2">
                  {result.status === "approved" ? (
                    <CheckCircle2 className="h-5 w-5 text-emerald-500" />
                  ) : (
                    <XCircle className={`h-5 w-5 ${result.status === "rejected" ? "text-red-500" : "text-muted-foreground"}`} />
                  )}
                  <span className="font-semibold">
                    {result.status === "approved" ? "Dokumen Aktif" : result.status === "rejected" ? "Ditolak" : "Menunggu Review Admin"}
                  </span>
                </div>
                {result.moderation && (
                  <>
                    <p className="text-sm text-muted-foreground">{result.moderation.alasan}</p>
                    <div className="flex flex-wrap gap-1.5">
                      {result.moderation.tag_otomatis?.map((t) => (
                        <Badge key={t} variant="secondary" className="text-xs">#{t}</Badge>
                      ))}
                    </div>
                    <div className="text-sm">
                      <span className="text-muted-foreground">Skor kualitas: </span>
                      <span className="font-semibold">{result.moderation.skor_kualitas}/100</span>
                    </div>
                  </>
                )}
              </CardContent>
            </Card>

            {/* Struktur ekstraksi AI */}
            {result.metadata && (
              <Card>
                <CardHeader className="pb-2">
                  <CardTitle className="flex items-center gap-2 text-base">
                    <BookMarked className="h-4 w-4 text-primary" /> Struktur Terdeteksi
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div>
                    <p className="font-semibold text-sm">{result.metadata.judul_dokumen}</p>
                    <p className="text-sm text-muted-foreground mt-1">{result.metadata.ringkasan}</p>
                  </div>

                  <div className="grid grid-cols-2 gap-2 text-sm">
                    <div className="rounded-lg bg-muted/60 p-2.5">
                      <p className="text-xs text-muted-foreground">Mata kuliah</p>
                      <p className="font-medium text-sm mt-0.5">{result.metadata.mata_kuliah_terkait}</p>
                    </div>
                    <div className="rounded-lg bg-muted/60 p-2.5">
                      <p className="text-xs text-muted-foreground flex items-center gap-1">
                        <BarChart3 className="h-3 w-3" /> Tingkat
                      </p>
                      <p className="font-medium text-sm mt-0.5">{result.metadata.estimasi_tingkat_kesulitan}</p>
                    </div>
                  </div>

                  <div>
                    <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-1.5">
                      Struktur bab
                    </p>
                    <div className="space-y-1.5">
                      {result.metadata.struktur?.slice(0, 8).map((s) => (
                        <div key={s.bab} className="text-sm flex gap-2">
                          <Badge variant="outline" className="shrink-0 h-fit">{s.bab}</Badge>
                          <div className="min-w-0">
                            <p className="font-medium leading-tight">{s.judul}</p>
                            {s.subtopik?.length > 0 && (
                              <p className="text-xs text-muted-foreground mt-0.5">{s.subtopik.join(" · ")}</p>
                            )}
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>

                  <div>
                    <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-1.5 flex items-center gap-1">
                      <Tags className="h-3 w-3" /> Kata kunci
                    </p>
                    <div className="flex flex-wrap gap-1.5">
                      {result.metadata.kata_kunci?.map((k) => (
                        <Badge key={k} variant="secondary" className="text-xs">{k}</Badge>
                      ))}
                    </div>
                  </div>

                  <div className="flex items-center gap-2 text-xs text-muted-foreground border-t pt-3">
                    <FileText className="h-3.5 w-3.5" />
                    {result.wordCount.toLocaleString("id-ID")} kata • {result.chunkCount} potongan RAG terindeks
                  </div>
                </CardContent>
              </Card>
            )}
          </motion.div>
        )}

        {!result && !processing && (
          <Card className="border-dashed hidden lg:block">
            <CardContent className="p-8 text-center text-sm text-muted-foreground">
              <BookMarked className="h-10 w-10 mx-auto text-muted-foreground/40" />
              <p className="mt-3">
                Hasil ekstraksi struktur & moderasi AI akan tampil di sini setelah kamu mengunggah dokumen.
              </p>
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  );
}
