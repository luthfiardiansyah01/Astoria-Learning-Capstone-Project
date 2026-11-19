import { describe, expect, it } from "vitest";
import { splitDocument } from "@/lib/doc-split";

describe("splitDocument", () => {
  it("tidak memecah dokumen pendek", () => {
    const parts = splitDocument("Isi modul singkat.", 100);
    expect(parts).toHaveLength(1);
    expect(parts[0].chars).toBeLessThanOrEqual(100);
  });

  it("memecah berdasarkan bab dan menjaga batas", () => {
    const text = [
      "BAB 1 PENDAHULUAN",
      "A".repeat(60),
      "",
      "BAB 2 PEMBAHASAN",
      "B".repeat(60),
      "",
      "BAB 3 PENUTUP",
      "C".repeat(60),
    ].join("\n");
    const parts = splitDocument(text, 80);
    expect(parts.length).toBeGreaterThan(1);
    for (const part of parts) {
      expect(part.chars).toBeLessThanOrEqual(80);
      expect(part.content.length).toBeGreaterThan(0);
    }
    expect(parts.some((part) => /BAB 1/i.test(part.content))).toBe(true);
    expect(parts.some((part) => /BAB 2/i.test(part.content))).toBe(true);
  });

  it("memecah paragraf yang terlalu panjang", () => {
    const text = "x".repeat(250);
    const parts = splitDocument(text, 100);
    expect(parts.length).toBeGreaterThanOrEqual(3);
    for (const part of parts) expect(part.chars).toBeLessThanOrEqual(100);
  });

  it("mengembalikan daftar kosong untuk teks kosong", () => {
    expect(splitDocument("   ", 100)).toEqual([]);
  });
});
