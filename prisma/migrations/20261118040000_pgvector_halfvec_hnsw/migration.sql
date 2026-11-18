-- HNSW untuk vektor 2048 dimensi memakai halfvec (batas vector biasa: 2000).
-- Hanya dijalankan bila ekstensi vector tersedia (pgvector >= 0.7).

DO $$
BEGIN
    IF EXISTS (SELECT 1 FROM pg_extension WHERE extname = 'vector') THEN
        BEGIN
            CREATE INDEX IF NOT EXISTS "Chunk_embeddingVec_hnsw"
                ON "Chunk" USING hnsw (("embeddingVec"::halfvec(2048)) halfvec_cosine_ops);
        EXCEPTION WHEN OTHERS THEN
            RAISE NOTICE 'Gagal membuat index HNSW halfvec: %', SQLERRM;
        END;
    END IF;
END $$;
