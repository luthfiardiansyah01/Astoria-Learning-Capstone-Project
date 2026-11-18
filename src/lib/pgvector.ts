// Akses opsional ke pgvector. Jika ekstensi/kolom tidak tersedia, semua fungsi
// menjadi no-op dan aplikasi memakai cosine similarity di JavaScript.
import { db } from "./db";
import { logger } from "./logger";

let available: boolean | null = null;

export function toVectorLiteral(vector: number[]) {
  return `[${vector.map((v) => (Number.isFinite(v) ? v : 0)).join(",")}]`;
}

export async function pgvectorAvailable() {
  if (available !== null) return available;
  try {
    const rows = await db.$queryRawUnsafe<Array<{ ok: boolean }>>(
      `SELECT EXISTS (
         SELECT 1 FROM information_schema.columns
         WHERE table_name = 'Chunk' AND column_name = 'embeddingVec'
       ) AND EXISTS (SELECT 1 FROM pg_extension WHERE extname = 'vector') AS ok`
    );
    available = Boolean(rows[0]?.ok);
  } catch {
    available = false;
  }
  return available;
}

/** Simpan vektor ke kolom pgvector; kegagalan tidak menggagalkan alur utama. */
export async function storeChunkVector(chunkId: string, vector: number[]) {
  if (!(await pgvectorAvailable())) return false;
  try {
    await db.$executeRawUnsafe(
      `UPDATE "Chunk" SET "embeddingVec" = $1::vector WHERE id = $2`,
      toVectorLiteral(vector),
      chunkId
    );
    return true;
  } catch (e) {
    logger.warn("[pgvector] gagal menyimpan vektor", { error: e instanceof Error ? e.message : e });
    return false;
  }
}

export interface VectorHit {
  id: string;
  content: string;
  similarity: number;
}

/** Cari chunk paling mirip untuk satu dokumen. Null bila pgvector tidak aktif. */
export async function vectorSearch(
  documentId: string,
  queryVector: number[],
  limit = 100
): Promise<VectorHit[] | null> {
  if (!(await pgvectorAvailable())) return null;
  try {
    const rows = await db.$queryRawUnsafe<VectorHit[]>(
      `SELECT id, content,
              (1 - ("embeddingVec"::halfvec(2048) <=> $1::halfvec(2048)))::float8 AS similarity
       FROM "Chunk"
       WHERE "documentId" = $2 AND "embeddingVec" IS NOT NULL
       ORDER BY "embeddingVec"::halfvec(2048) <=> $1::halfvec(2048)
       LIMIT $3`,
      toVectorLiteral(queryVector),
      documentId,
      limit
    );
    return rows;
  } catch (e) {
    logger.warn("[pgvector] pencarian vektor gagal, memakai fallback JSON", {
      error: e instanceof Error ? e.message : e,
    });
    return null;
  }
}
