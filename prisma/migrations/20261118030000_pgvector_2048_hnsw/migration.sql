-- P5 lanjutan: sesuaikan dimensi vektor dengan model embedding (2048) dan
-- tambahkan index HNSW. Hanya dijalankan bila ekstensi vector tersedia.

DO $$
BEGIN
    IF EXISTS (SELECT 1 FROM pg_extension WHERE extname = 'vector') THEN
        BEGIN
            ALTER TABLE "Chunk" ALTER COLUMN "embeddingVec" TYPE vector(2048);
        EXCEPTION WHEN OTHERS THEN
            RAISE NOTICE 'Gagal mengubah dimensi embeddingVec: %', SQLERRM;
        END;

        BEGIN
            CREATE INDEX IF NOT EXISTS "Chunk_embeddingVec_hnsw"
                ON "Chunk" USING hnsw ("embeddingVec" vector_cosine_ops);
        EXCEPTION WHEN OTHERS THEN
            RAISE NOTICE 'Gagal membuat index HNSW: %', SQLERRM;
        END;
    ELSE
        RAISE NOTICE 'pgvector tidak tersedia; index HNSW dilewati';
    END IF;
END $$;
