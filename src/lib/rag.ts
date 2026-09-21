// src/lib/rag.ts
// Retrieval-Augmented Generation sederhana:
// - Chunking: sliding window ±500 token (±2000 karakter), overlap ±50 token (±200 karakter)
// - Retrieval: skor kemiripan berbasis kata kunci (term frequency) — pengganti cosine
//   similarity embedding saat embedding API tidak tersedia.
// - MAX_CONTEXT_LENGTH = 6.000 karakter sesuai spesifikasi.

export const MAX_CONTEXT_LENGTH = 6000;
export const MAX_DOC_LENGTH = 50000;
const CHUNK_SIZE = 2000; // ±500 token
const CHUNK_OVERLAP = 200; // ±50 token

const STOPWORDS = new Set([
  "yang", "dan", "di", "ke", "dari", "untuk", "pada", "dengan", "adalah", "itu",
  "ini", "atau", "juga", "akan", "tidak", "bisa", "dapat", "apa", "bagaimana",
  "mengapa", "kenapa", "siapa", "kapan", "dimana", "adalah", "ialah", "sebuah",
  "sebagai", "oleh", "tersebut", "kalau", "jika", "agar", "supaya", "saya",
  "kamu", "anda", "kami", "mereka", "dia", "punya", "ada", "dalam", "secara",
  "sudah", "telah", "masih", "hanya", "lebih", "paling", "sangat", "the", "a",
  "an", "of", "to", "in", "is", "are", "what", "how", "why", "who", "and", "or",
]);

export function tokenize(text: string): string[] {
  return text
    .toLowerCase()
    .replace(/[^\p{L}\p{N}\s]/gu, " ")
    .split(/\s+/)
    .filter((t) => t.length > 2 && !STOPWORDS.has(t));
}

// ── Chunking: sliding window ──────────────────────────────────────────────────
export function chunkDocument(content: string): { content: string; keywords: string }[] {
  const clean = content.replace(/\r\n/g, "\n").trim();
  if (clean.length <= CHUNK_SIZE) {
    return [{ content: clean, keywords: tokenize(clean).join(" ") }];
  }

  const chunks: string[] = [];
  let start = 0;
  while (start < clean.length) {
    let end = Math.min(start + CHUNK_SIZE, clean.length);
    // Potong di batas kalimat/spasi agar chunk tidak terpotong di tengah kata
    if (end < clean.length) {
      const lastPeriod = clean.lastIndexOf(".", end);
      const lastSpace = clean.lastIndexOf(" ", end);
      const cut = Math.max(lastPeriod, lastSpace);
      if (cut > start + CHUNK_SIZE * 0.6) end = cut + 1;
    }
    chunks.push(clean.slice(start, end).trim());
    start = Math.max(end - CHUNK_OVERLAP, start + 1);
  }

  return chunks.map((c) => ({ content: c, keywords: tokenize(c).join(" ") }));
}

// ── Retrieval: skor kata kunci ───────────────────────────────────────────────
export function retrieveRelevantChunks(
  question: string,
  chunks: { content: string; keywords: string }[]
): { context: string; isPartial: boolean } {
  if (chunks.length === 0) return { context: "", isPartial: false };

  const qTerms = tokenize(question);
  if (qTerms.length === 0) {
    // Tanpa kata kunci → ambil chunk awal
    const joined = chunks.slice(0, 1).map((c) => c.content).join("\n\n");
    return { context: joined.slice(0, MAX_CONTEXT_LENGTH), isPartial: chunks.length > 1 };
  }

  const scored = chunks.map((chunk, idx) => {
    const terms = chunk.keywords ? chunk.keywords.split(" ") : tokenize(chunk.content);
    const tf = new Map<string, number>();
    for (const t of terms) tf.set(t, (tf.get(t) ?? 0) + 1);

    let score = 0;
    for (const q of qTerms) score += tf.get(q) ?? 0;
    // bonus posisi awal (judul/pendahuluan biasanya penting)
    score += Math.max(0, 2 - idx * 0.1);
    return { idx, content: chunk.content, score };
  });

  scored.sort((a, b) => b.score - a.score);

  const selected: string[] = [];
  let total = 0;
  for (const s of scored) {
    if (s.score <= 0) continue;
    if (total + s.content.length > MAX_CONTEXT_LENGTH) break;
    selected.push(s.content);
    total += s.content.length;
  }

  // Jika tidak ada yang skornya > 0, fallback ke chunk teratas berdasar skor
  if (selected.length === 0) {
    selected.push(scored[0].content);
    total = scored[0].content.length;
  }

  // Urutkan sesuai posisi asli agar konteks mengalir alami
  const ordered = scored
    .filter((s) => selected.includes(s.content))
    .sort((a, b) => a.idx - b.idx)
    .map((s) => s.content);

  return {
    context: ordered.join("\n\n").slice(0, MAX_CONTEXT_LENGTH),
    isPartial: total < chunks.reduce((acc, c) => acc + c.content.length, 0),
  };
}

export function countWords(text: string): number {
  return text.trim().split(/\s+/).filter(Boolean).length;
}
