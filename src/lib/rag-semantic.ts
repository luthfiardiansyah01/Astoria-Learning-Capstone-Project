// src/lib/rag-semantic.ts
// Retrieval hybrid: kemiripan embedding (makna) + skor kata kunci.
// Jika API embedding gagal, otomatis jatuh ke retrieval kata kunci (rag.ts).

import { db } from "./db";
import { embedTexts } from "./ai";
import { MAX_CONTEXT_LENGTH, retrieveRelevantChunks, tokenize } from "./rag";

const EMBED_BATCH = 16;
const SEMANTIC_WEIGHT = 0.65;

function cosine(a: number[], b: number[]): number {
  let dot = 0;
  let na = 0;
  let nb = 0;
  const n = Math.min(a.length, b.length);
  for (let i = 0; i < n; i++) {
    dot += a[i] * b[i];
    na += a[i] * a[i];
    nb += b[i] * b[i];
  }
  return na && nb ? dot / (Math.sqrt(na) * Math.sqrt(nb)) : 0;
}

type ChunkRow = { id: string; content: string; keywords: string; embedding: string | null };

/** Embed chunk yang belum punya vektor (dokumen lama/embedding sebelumnya gagal) dan simpan. */
export async function ensureChunkEmbeddings(chunks: ChunkRow[]): Promise<Map<string, number[]>> {
  const vectors = new Map<string, number[]>();
  const missing: ChunkRow[] = [];
  for (const c of chunks) {
    if (c.embedding) vectors.set(c.id, JSON.parse(c.embedding));
    else missing.push(c);
  }

  for (let i = 0; i < missing.length; i += EMBED_BATCH) {
    const batch = missing.slice(i, i + EMBED_BATCH);
    const result = await embedTexts(batch.map((c) => c.content));
    if (!result) break;
    await Promise.all(
      batch.map((c, j) => {
        vectors.set(c.id, result[j]);
        return db.chunk.update({ where: { id: c.id }, data: { embedding: JSON.stringify(result[j]) } });
      })
    );
  }
  return vectors;
}

export async function retrieveForDocument(
  documentId: string,
  question: string
): Promise<{ context: string; isPartial: boolean; mode: "hybrid" | "keyword" }> {
  const chunks = await db.chunk.findMany({
    where: { documentId },
    orderBy: { chunkIndex: "asc" },
    select: { id: true, content: true, keywords: true, embedding: true },
  });

  const keywordOnly = () => ({
    ...retrieveRelevantChunks(question, chunks),
    mode: "keyword" as const,
  });
  if (chunks.length === 0) return keywordOnly();

  const [vectors, qVec] = await Promise.all([ensureChunkEmbeddings(chunks), embedTexts([question])]);
  if (!qVec || vectors.size === 0) return keywordOnly();

  const qTerms = tokenize(question);
  const rawKeyword = chunks.map((c) => {
    const tf = new Map<string, number>();
    for (const t of c.keywords ? c.keywords.split(" ") : tokenize(c.content)) tf.set(t, (tf.get(t) ?? 0) + 1);
    return qTerms.reduce((acc, q) => acc + (tf.get(q) ?? 0), 0);
  });
  const maxKeyword = Math.max(...rawKeyword, 1);

  const scored = chunks.map((c, idx) => {
    const vec = vectors.get(c.id);
    const semantic = vec ? Math.max(0, cosine(qVec[0], vec)) : 0;
    return {
      idx,
      content: c.content,
      score: SEMANTIC_WEIGHT * semantic + (1 - SEMANTIC_WEIGHT) * (rawKeyword[idx] / maxKeyword),
    };
  });
  scored.sort((a, b) => b.score - a.score);

  const selected = new Set<number>();
  let total = 0;
  for (const s of scored) {
    if (total + s.content.length > MAX_CONTEXT_LENGTH) continue;
    selected.add(s.idx);
    total += s.content.length;
  }
  if (selected.size === 0) selected.add(scored[0].idx);

  const context = chunks
    .filter((_, idx) => selected.has(idx))
    .map((c) => c.content)
    .join("\n\n")
    .slice(0, MAX_CONTEXT_LENGTH);

  return {
    context,
    isPartial: selected.size < chunks.length,
    mode: "hybrid",
  };
}
