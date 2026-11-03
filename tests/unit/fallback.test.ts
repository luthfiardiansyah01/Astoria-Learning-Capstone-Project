import { describe, expect, it } from "vitest";
import { FALLBACK_RESPONSES, isOutOfContext, preprocessUserInput } from "@/lib/fallback";
import { fallbackDocMetadata, fallbackModeration } from "@/lib/doc-fallback";

describe("isOutOfContext", () => {
  it("mendeteksi penanda jawaban di luar modul", () => {
    expect(isOutOfContext("Maaf, informasi itu tidak tersedia dalam modul.")).toBe(true);
    expect(isOutOfContext("Saya tidak menemukan pembahasan tersebut.")).toBe(true);
  });

  it("tidak menandai jawaban yang relevan", () => {
    expect(isOutOfContext("Ekonomi membahas permintaan dan penawaran.")).toBe(false);
  });

  it("tidak peka huruf besar-kecil", () => {
    expect(isOutOfContext("TIDAK ADA DALAM DOKUMEN ini.")).toBe(true);
  });
});

describe("preprocessUserInput", () => {
  it("memangkas spasi", () => {
    expect(preprocessUserInput("  Apa itu inflasi?  ")).toBe("Apa itu inflasi?");
  });

  it("menolak pertanyaan terlalu pendek", () => {
    expect(() => preprocessUserInput("  a ")).toThrow("minimal 3 karakter");
  });

  it("memotong pertanyaan lebih dari 800 karakter", () => {
    const result = preprocessUserInput("a".repeat(900));
    expect(result).toHaveLength(803);
    expect(result.endsWith("...")).toBe(true);
  });
});

describe("FALLBACK_RESPONSES", () => {
  it("menyediakan pesan untuk semua skenario utama", () => {
    for (const key of [
      "no_document",
      "out_of_context",
      "api_error",
      "inappropriate",
      "doc_too_large",
    ] as const) {
      expect(FALLBACK_RESPONSES[key].length).toBeGreaterThan(20);
    }
  });
});

describe("fallbackDocMetadata", () => {
  const content = [
    "BAB 1 PENGANTAR EKONOMI",
    "[Halaman 1]",
    "Ekonomi adalah ilmu yang mempelajari perilaku manusia dalam memenuhi kebutuhan hidupnya.",
    "Permintaan dan penawaran menentukan harga pasar secara bersama-sama.",
    "BAB 2 PERMINTAAN DAN PENAWARAN",
    "Hukum permintaan menyatakan bahwa harga naik maka jumlah permintaan turun.",
  ].join("\n");

  it("mengambil judul dari baris pertama", () => {
    const result = fallbackDocMetadata("modul-ekonomi.pdf", content);
    expect(result.judul_dokumen).toBe("BAB 1 PENGANTAR EKONOMI");
  });

  it("membuat ringkasan dari kalimat bermakna", () => {
    const result = fallbackDocMetadata("modul.pdf", content);
    expect(result.ringkasan.length).toBeGreaterThan(40);
    expect(result.ringkasan).not.toContain("[Halaman 1]");
  });

  it("menghasilkan kata kunci dan topik", () => {
    const result = fallbackDocMetadata("modul.pdf", content);
    expect(result.kata_kunci.length).toBeGreaterThan(0);
    expect(result.kata_kunci.length).toBeLessThanOrEqual(10);
    expect(result.topik_utama.length).toBeLessThanOrEqual(4);
  });

  it("mendeteksi heading menjadi struktur dokumen", () => {
    const result = fallbackDocMetadata("modul.pdf", content);
    expect(result.struktur.length).toBeGreaterThanOrEqual(2);
    expect(result.struktur[0].judul).toContain("BAB 1");
  });

  it("memakai nama file bila tidak ada baris judul", () => {
    const result = fallbackDocMetadata("catatan-ekonomi.txt", "");
    expect(result.judul_dokumen).toBe("catatan ekonomi");
    expect(result.struktur).toHaveLength(1);
    expect(result.ringkasan.length).toBeGreaterThan(0);
  });

  it("memberi nilai default yang aman", () => {
    const result = fallbackDocMetadata("x.txt", "Isi singkat.");
    expect(result.estimasi_tingkat_kesulitan).toBe("Menengah");
    expect(result.mata_kuliah_terkait).toBe("Umum");
  });
});

describe("fallbackModeration", () => {
  it("menandai dokumen layak dan menunggu review admin", () => {
    const result = fallbackModeration();
    expect(result.layak).toBe(true);
    expect(result.skor_kualitas).toBe(70);
    expect(result.rekomendasi_admin).toBe("Review manual");
    expect(result.tag_otomatis).toEqual([]);
  });
});
