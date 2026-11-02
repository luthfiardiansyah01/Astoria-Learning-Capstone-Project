// Unggah Dokumen — pemrosesan dokumen (Seksi 4) + status moderasi (Seksi 5.1)
"use client";

import { useRef, useState } from "react";
import { useQueryClient } from "@tanstack/react-query";
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
  AlertTriangle,
  RotateCcw,
  Trash2,
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
    aiWarnings?: string[];
  };
}

const MAX_TEXT_BYTES = 1 * 1024 * 1024;
const MAX_PDF_BYTES = 5 * 1024 * 1024;
const MAX_CONTENT_CHARS = 20_000;

export function UploadView() {
  const { toast } = useToast();
  const { setActiveDocument, setView } = useAstoria();
  const queryClient = useQueryClient();
  const [fileName, setFileName] = useState("");
  const [content, setContent] = useState("");
  const [processing, setProcessing] = useState(false);
  const [readingFile, setReadingFile] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [fileInfo, setFileInfo] = useState<{ kind: "pdf" | "text"; pages?: number; chars: number } | null>(null);
  const [result, setResult] = useState<UploadResult["document"] | null>(null);
  const [dragOver, setDragOver] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const charCount = content.length;
  const tooLong = charCount > MAX_CONTENT_CHARS;

  const readFile = async (file: File) => {
    const lower = file.name.toLowerCase();
    const isPdf = lower.endsWith(".pdf") || file.type === "application/pdf";
    const isText =
      /\.(txt|md|markdown)$/i.test(lower) ||
      file.type === "text/plain" ||
      file.type === "text/markdown";

    if (!isPdf && !isText) {
      toast({
        title: "Format tidak didukung",
        description: "Gunakan PDF, TXT, MD, atau tempel teks modul langsung.",
        variant: "destructive",
      });
      return;
    }

    const maxBytes = isPdf ? MAX_PDF_BYTES : MAX_TEXT_BYTES;
    if (file.size > maxBytes) {
      toast({
        title: "File terlalu besar",
        description: isPdf ? "Maksimal 5 MB untuk PDF." : "Maksimal 1 MB untuk file teks.",
        variant: "destructive",
      });
      return;
    }

    setReadingFile(true);
    setResult(null);
    setFileInfo(null);

    try {
      let text = "";
      let pages: number | undefined;

      if (isPdf) {
        const pdfjs = await import("pdfjs-dist");
        pdfjs.GlobalWorkerOptions.workerSrc = "/pdf.worker.min.mjs";
        const buffer = await file.arrayBuffer();
        const loadingTask = pdfjs.getDocument({ data: new Uint8Array(buffer) });
        const pdf = await loadingTask.promise;
        pages = pdf.numPages;
        const parts: string[] = [];

        for (let p = 1; p <= pdf.numPages; p++) {
          const page = await pdf.getPage(p);
          const pageContent = await page.getTextContent();
          let pageText = "";
          for (const item of pageContent.items) {
            if (!("str" in item)) continue;
            pageText += item.str;
            pageText += item.hasEOL ? "\n" : " ";
          }
          parts.push(`[Halaman ${p}]\n${pageText.trim()}`);
        }

        await loadingTask.destroy();
        text = parts
          .join("\n\n")
          .replace(/[ \t]+\n/g, "\n")
          .replace(/\n{3,}/g, "\n\n")
          .trim();

        if (text.replace(/\[Halaman \d+\]/g, "").trim().length < 30) {
          toast({
            title: "PDF tidak berisi teks",
            description:
              "Kemungkinan PDF hasil scan/gambar. Gunakan PDF berbasis teks atau tempel isi modulnya.",
            variant: "destructive",
          });
          return;
        }
      } else {
        text = await file.text();
      }

      setFileName(file.name);
      setContent(text);
      setFileInfo({ kind: isPdf ? "pdf" : "text", pages, chars: text.length });
      toast({
        title: isPdf ? "PDF berhasil dibaca" : "File berhasil dibaca",
        description: isPdf
          ? `${pages} halaman • ${text.length.toLocaleString("id-ID")} karakter. Periksa hasilnya sebelum diproses.`
          : `${text.length.toLocaleString("id-ID")} karakter. Periksa hasilnya sebelum diproses.`,
      });
    } catch (e) {
      const message = e instanceof Error ? e.message : "";
      const isPassword = /password/i.test(message);
      toast({
        title: isPassword ? "PDF terkunci password" : "Gagal membaca PDF",
        description: isPassword
          ? "Hapus password PDF terlebih dahulu, lalu unggah ulang."
          : "Pastikan file PDF valid dan tidak rusak.",
        variant: "destructive",
      });
    } finally {
      setReadingFile(false);
    }
  };

  const submit = async () => {
    if (!content.trim()) {
      toast({
        title: "Konten masih kosong",
        description: "Pilih file .pdf/.txt/.md atau tempel teks modul kamu dulu ya!",
        variant: "destructive",
      });
      return;
    }
    if (tooLong) {
      toast({
        title: "Dokumen terlalu panjang",
        description: `Maksimal ${MAX_CONTENT_CHARS.toLocaleString("id-ID")} karakter. Potong per bab atau unggah sebagian.`,
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
      queryClient.invalidateQueries({ queryKey: ["documents"] });
      queryClient.invalidateQueries({ queryKey: ["profile"] });
      queryClient.invalidateQueries({ queryKey: ["greeting"] });
      if (data.document.aiWarnings?.length) {
        toast({
          title: "Sebagian proses AI gagal",
          description: data.document.aiWarnings.join(" "),
          variant: "destructive",
        });
      }
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

  const resetForm = () => {
    setResult(null);
    setFileName("");
    setContent("");
    setFileInfo(null);
    setActiveDocument(null);
    if (fileInputRef.current) fileInputRef.current.value = "";
  };

  const deleteUploaded = async () => {
    if (!result) return;
    if (!window.confirm(`Hapus dokumen "${result.fileName}" beserta cache/indeksnya?`)) return;
    setDeleting(true);
    try {
      const res = await fetch(`/api/documents/${result.id}`, { method: "DELETE" });
      const data = await res.json();
      if (!res.ok) {
        toast({ title: "Gagal menghapus", description: data.error, variant: "destructive" });
        return;
      }
      resetForm();
      queryClient.invalidateQueries({ queryKey: ["documents"] });
      queryClient.invalidateQueries({ queryKey: ["profile"] });
      queryClient.invalidateQueries({ queryKey: ["greeting"] });
      toast({ title: "Dokumen dihapus", description: "Dokumen, chunk, dan cache terkait sudah dibersihkan." });
    } catch {
      toast({ title: "Gagal menghapus", description: "Coba lagi beberapa saat.", variant: "destructive" });
    } finally {
      setDeleting(false);
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
              onClick={() => {
                if (!readingFile) fileInputRef.current?.click();
              }}
              onKeyDown={(e) => {
                if (e.key === "Enter" && !readingFile) fileInputRef.current?.click();
              }}
              onDragOver={(e) => {
                e.preventDefault();
                if (!readingFile) setDragOver(true);
              }}
              onDragLeave={() => setDragOver(false)}
              onDrop={(e) => {
                e.preventDefault();
                setDragOver(false);
                if (readingFile) return;
                const file = e.dataTransfer.files?.[0];
                if (file) void readFile(file);
              }}
              className={`rounded-2xl border-2 border-dashed p-8 text-center cursor-pointer transition-colors ${
                dragOver ? "border-primary bg-primary/5" : "border-border hover:border-primary/50"
              } ${readingFile ? "pointer-events-none opacity-70" : ""}`}
            >
              {readingFile ? (
                <>
                  <Loader2 className="h-10 w-10 mx-auto text-primary animate-spin" />
                  <p className="mt-3 font-medium">Membaca file…</p>
                  <p className="text-sm text-muted-foreground mt-1">
                    Mengekstrak teks dari PDF. Mohon tunggu.
                  </p>
                </>
              ) : (
                <>
                  <UploadCloud className="h-10 w-10 mx-auto text-muted-foreground/60" />
                  <p className="mt-3 font-medium">Tarik & lepas file, atau klik untuk memilih</p>
                  <p className="text-sm text-muted-foreground mt-1">
                    PDF, TXT, atau MD · PDF maks 5 MB, teks maks 1 MB
                  </p>
                  <p className="text-xs text-muted-foreground mt-1">
                    PDF harus berbasis teks (bukan hasil scan)
                  </p>
                </>
              )}
              <input
                ref={fileInputRef}
                type="file"
                accept=".pdf,.txt,.md,.markdown,application/pdf,text/plain,text/markdown"
                className="sr-only"
                onChange={(e) => {
                  const f = e.target.files?.[0];
                  if (f) void readFile(f);
                  e.target.value = "";
                }}
              />
            </div>

            {fileInfo && (
              <div className="flex flex-wrap items-center gap-2 text-xs text-muted-foreground">
                <FileText className="h-3.5 w-3.5" />
                <span>
                  {fileInfo.kind === "pdf" ? `PDF • ${fileInfo.pages} halaman` : "File teks"} •{" "}
                  {fileInfo.chars.toLocaleString("id-ID")} karakter
                </span>
                {fileInfo.kind === "pdf" && (
                  <Badge variant="secondary" className="text-[10px]">
                    teks diekstrak
                  </Badge>
                )}
              </div>
            )}

            <div className="grid gap-2">
              <Input
                placeholder="Nama dokumen (mis. modul-sim-bab4.pdf)"
                value={fileName}
                onChange={(e) => setFileName(e.target.value)}
              />
              <div className="relative">
                <Textarea
                  placeholder="…atau tempel isi modul di sini, lalu klik Proses Dokumen"
                  value={content}
                  onChange={(e) => {
                    setContent(e.target.value);
                    setFileInfo(null);
                    setResult(null);
                  }}
                  rows={9}
                  className="resize-y"
                />
                <span
                  className={`absolute bottom-2 right-3 text-[11px] ${
                    tooLong ? "text-destructive font-semibold" : "text-muted-foreground"
                  }`}
                >
                  {charCount.toLocaleString("id-ID")} / {MAX_CONTENT_CHARS.toLocaleString("id-ID")} karakter
                </span>
              </div>
              {tooLong && (
                <p className="text-xs text-destructive">
                  Konten melebihi batas. Potong per bab atau unggah sebagian agar bisa diproses.
                </p>
              )}
            </div>

            <div className="flex flex-wrap gap-2">
              <Button
                onClick={submit}
                disabled={processing || readingFile || !content.trim() || tooLong}
              >
                {processing ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" /> Menganalisis dokumen…
                  </>
                ) : readingFile ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" /> Membaca file…
                  </>
                ) : (
                  <>
                    <ClipboardPaste className="mr-2 h-4 w-4" /> Proses Dokumen
                  </>
                )}
              </Button>
              {result && (
                <>
                  <Button variant="outline" onClick={() => setView("mentor")}>
                    Tanya Mentor tentang dokumen ini →
                  </Button>
                  <Button variant="ghost" onClick={resetForm} className="gap-1.5">
                    <RotateCcw className="h-4 w-4" /> Unggah dokumen lain
                  </Button>
                  <Button
                    variant="ghost"
                    onClick={deleteUploaded}
                    disabled={deleting}
                    className="gap-1.5 text-destructive"
                  >
                    <Trash2 className="h-4 w-4" /> {deleting ? "Menghapus..." : "Hapus dokumen"}
                  </Button>
                </>
              )}
            </div>
          </CardContent>
        </Card>

        {/* Info alur */}
        <Card className="border-dashed">
          <CardContent className="p-4 text-sm text-muted-foreground space-y-1.5">
            <p className="font-medium text-foreground flex items-center gap-2">
              <Lightbulb className="h-4 w-4 text-amber-600 dark:text-amber-400" /> Apa yang terjadi setelah unggah?
            </p>
            <p>
              1. Untuk PDF, teks diekstrak di browser menjadi teks biasa sebelum dikirim.
              2. Dokumen dipecah menjadi potongan (chunk) untuk pencarian jawaban RAG.
              3. AI mengekstrak struktur: bab, topik, kata kunci, mata kuliah terkait.
              4. Content Moderator menilai kelayakan dokumen secara otomatis.
            </p>
            <p className="text-xs">
              PDF hasil scan/gambar belum didukung karena tidak memiliki lapisan teks. Tempel teksnya
              secara manual atau gunakan PDF hasil ekspor dokumen.
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
            {result.aiWarnings && result.aiWarnings.length > 0 && (
              <Card className="border-amber-300 bg-amber-50 dark:border-amber-800 dark:bg-amber-950/40">
                <CardContent className="p-4 text-sm space-y-1">
                  <p className="flex items-center gap-2 font-semibold text-amber-800 dark:text-amber-300">
                    <AlertTriangle className="h-4 w-4" /> Sebagian proses AI gagal
                  </p>
                  {result.aiWarnings.map((w) => (
                    <p key={w} className="text-amber-800 dark:text-amber-300">
                      • {w}
                    </p>
                  ))}
                  <p className="text-xs text-amber-700/80 dark:text-amber-400/80">
                    Dokumen tetap tersimpan. Coba proses ulang atau hubungi admin.
                  </p>
                </CardContent>
              </Card>
            )}
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
