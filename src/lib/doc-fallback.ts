// Fallback deterministik saat layanan AI tidak tersedia (mis. kuota harian habis).
// Struktur dokumen dan moderasi tetap bisa diproses tanpa AI, lalu admin meninjau manual.

import { tokenize } from "./rag";

export interface FallbackDocMetadata {
  judul_dokumen: string;
  ringkasan: string;
  topik_utama: string[];
  struktur: { bab: string; judul: string; subtopik: string[] }[];
  kata_kunci: string[];
  estimasi_tingkat_kesulitan: string;
  mata_kuliah_terkait: string;
}

export interface FallbackModeration {
  layak: boolean;
  skor_kualitas: number;
  alasan: string;
  tag_otomatis: string[];
  rekomendasi_admin: string;
}

export function fallbackDocMetadata(fileName: string, content: string): FallbackDocMetadata {
  const clean = content.replace(/\r\n/g, "\n").trim();
  const lines = clean
    .split("\n")
    .map((line) => line.trim())
    .filter((line) => line && !/^\[Halaman \d+\]$/i.test(line));

  const title =
    lines.find((line) => line.length >= 5 && line.length <= 120) ??
    fileName.replace(/\.[^.]+$/, "").replace(/[-_]+/g, " ");

  const sentences = clean
    .replace(/\[Halaman \d+\]/gi, " ")
    .split(/(?<=[.!?])\s+/)
    .map((s) => s.trim().replace(/\s+/g, " "))
    .filter((s) => s.length >= 40);

  const ringkasan = (sentences.slice(0, 2).join(" ") || clean.slice(0, 300)).slice(0, 420);

  const freq = new Map<string, number>();
  for (const word of tokenize(clean)) {
    freq.set(word, (freq.get(word) ?? 0) + 1);
  }
  const keywords = [...freq.entries()]
    .sort((a, b) => b[1] - a[1])
    .slice(0, 10)
    .map(([word]) => word);

  const headings = lines
    .filter(
      (line) =>
        /^(bab|bagian|chapter|unit|modul|\d+[.)])\s+/i.test(line) ||
        (line.length <= 90 && /^[A-Z0-9\s:–—-]{5,}$/.test(line))
    )
    .slice(0, 8);

  const struktur =
    headings.length > 0
      ? headings.map((heading, index) => ({
          bab: `Bagian ${index + 1}`,
          judul: heading.slice(0, 120),
          subtopik: keywords.slice(index * 2, index * 2 + 3),
        }))
      : [
          {
            bab: "Bagian 1",
            judul: title.slice(0, 120),
            subtopik: keywords.slice(0, 3),
          },
        ];

  return {
    judul_dokumen: title.slice(0, 120),
    ringkasan: ringkasan || "Ringkasan belum tersedia; dokumen perlu ditinjau manual.",
    topik_utama: keywords.slice(0, 4),
    struktur,
    kata_kunci: keywords,
    estimasi_tingkat_kesulitan: "Menengah",
    mata_kuliah_terkait: "Umum",
  };
}

export function fallbackModeration(): FallbackModeration {
  return {
    layak: true,
    skor_kualitas: 70,
    alasan:
      "Moderasi AI tidak tersedia saat ini (kuota/layanan). Dokumen disimpan dan menunggu review admin.",
    tag_otomatis: [],
    rekomendasi_admin: "Review manual",
  };
}
