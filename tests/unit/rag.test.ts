import { describe, expect, it } from "vitest";
import {
  MAX_CONTEXT_LENGTH,
  MAX_DOC_LENGTH,
  chunkDocument,
  countWords,
  retrieveRelevantChunks,
  tokenize,
} from "@/lib/rag";

describe("tokenize", () => {
  it("menghapus tanda baca, stopword, dan kata pendek", () => {
    expect(tokenize("Yang penting: materi belajar, dan hasilnya!")).toEqual([
      "penting",
      "materi",
      "belajar",
      "hasilnya",
    ]);
  });

  it("mengubah teks menjadi huruf kecil", () => {
    expect(tokenize("MODUL Belajar")).toEqual(["modul", "belajar"]);
  });

  it("mengembalikan array kosong untuk teks tanpa kata bermakna", () => {
    expect(tokenize("dan yang di ke")).toEqual([]);
  });
});

describe("chunkDocument", () => {
  it("mengembalikan satu chunk untuk dokumen pendek", () => {
    const chunks = chunkDocument("Materi singkat tentang ekonomi.");
    expect(chunks).toHaveLength(1);
    expect(chunks[0].content).toBe("Materi singkat tentang ekonomi.");
    expect(chunks[0].keywords).toContain("ekonomi");
  });

  it("memecah dokumen panjang menjadi beberapa chunk", () => {
    const content = Array.from({ length: 120 }, (_, i) => `Paragraf ${i} membahas materi pembelajaran.`).join(" ");
    const chunks = chunkDocument(content);
    expect(chunks.length).toBeGreaterThan(1);
    expect(chunks.length).toBeLessThan(10);
    for (const chunk of chunks) {
      expect(chunk.content.length).toBeLessThanOrEqual(2000);
      expect(chunk.content.length).toBeGreaterThan(0);
      expect(chunk.keywords.length).toBeGreaterThan(0);
    }
  });

  it("menormalkan CRLF dan memangkas spasi di tepi", () => {
    const chunks = chunkDocument("  Baris satu.\r\nBaris dua.  ");
    expect(chunks[0].content).toBe("Baris satu.\nBaris dua.");
  });

  it("mengembalikan chunk kosong untuk konten kosong", () => {
    const chunks = chunkDocument("   ");
    expect(chunks).toHaveLength(1);
    expect(chunks[0].content).toBe("");
  });
});

describe("retrieveRelevantChunks", () => {
  const chunks = [
    { content: "Ekonomi membahas permintaan dan penawaran.", keywords: "ekonomi membahas permintaan penawaran" },
    { content: "Manajemen membahas perencanaan organisasi.", keywords: "manajemen membahas perencanaan organisasi" },
  ];

  it("mengembalikan konteks kosong bila tidak ada chunk", () => {
    expect(retrieveRelevantChunks("apa itu ekonomi", [])).toEqual({ context: "", isPartial: false });
  });

  it("memilih chunk yang paling relevan", () => {
    const result = retrieveRelevantChunks("jelaskan manajemen organisasi", chunks);
    expect(result.context).toContain("Manajemen");
    expect(result.isPartial).toBe(false);
  });

  it("menandai isPartial bila konteks tidak muat semua chunk", () => {
    const longChunks = Array.from({ length: 6 }, (_, i) => ({
      content: `Manajemen organisasi bagian ${i}. `.repeat(70),
      keywords: "manajemen organisasi",
    }));
    const result = retrieveRelevantChunks("manajemen organisasi", longChunks);
    expect(result.isPartial).toBe(true);
    expect(result.context.length).toBeLessThanOrEqual(MAX_CONTEXT_LENGTH);
  });

  it("memakai chunk pertama bila pertanyaan tanpa kata kunci", () => {
    const result = retrieveRelevantChunks("dan yang di", chunks);
    expect(result.context).toContain("Ekonomi");
  });

  it("tetap mengembalikan konteks bila tidak ada skor positif", () => {
    const result = retrieveRelevantChunks("astronomi galaksi", chunks);
    expect(result.context.length).toBeGreaterThan(0);
  });

  it("tidak melebihi batas konteks", () => {
    const longChunks = Array.from({ length: 10 }, (_, i) => ({
      content: `Chunk ${i} `.repeat(400),
      keywords: "ekonomi",
    }));
    const result = retrieveRelevantChunks("ekonomi", longChunks);
    expect(result.context.length).toBeLessThanOrEqual(MAX_CONTEXT_LENGTH);
  });
});

describe("countWords", () => {
  it("menghitung kata dan mengabaikan spasi berlebih", () => {
    expect(countWords("  satu   dua tiga ")).toBe(3);
    expect(countWords("")).toBe(0);
    expect(countWords("   ")).toBe(0);
  });
});

describe("konstanta", () => {
  it("memakai batas dokumen 20.000 karakter", () => {
    expect(MAX_DOC_LENGTH).toBe(20_000);
  });
});
