-- P5: audit log admin, cache analitik persisten, dan kolom vektor opsional.

CREATE TABLE "AdminAuditLog" (
    "id" TEXT NOT NULL,
    "adminId" TEXT NOT NULL,
    "action" TEXT NOT NULL,
    "targetType" TEXT NOT NULL,
    "targetId" TEXT,
    "detail" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "AdminAuditLog_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "AdminAuditLog_createdAt_idx" ON "AdminAuditLog"("createdAt");
CREATE INDEX "AdminAuditLog_adminId_idx" ON "AdminAuditLog"("adminId");

ALTER TABLE "AdminAuditLog"
    ADD CONSTRAINT "AdminAuditLog_adminId_fkey"
    FOREIGN KEY ("adminId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "AdminAuditLog" ENABLE ROW LEVEL SECURITY;

CREATE TABLE "AnalyticsCache" (
    "key" TEXT NOT NULL,
    "payload" JSONB NOT NULL,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "AnalyticsCache_pkey" PRIMARY KEY ("key")
);

ALTER TABLE "AnalyticsCache" ENABLE ROW LEVEL SECURITY;

-- Opsional: aktifkan pgvector bila ekstensi tersedia (Supabase).
-- Bila tidak tersedia, migrasi tetap berhasil dan aplikasi memakai fallback JSON.
DO $$
BEGIN
    BEGIN
        CREATE EXTENSION IF NOT EXISTS vector;
    EXCEPTION WHEN OTHERS THEN
        RAISE NOTICE 'pgvector tidak tersedia; kolom embeddingVec dilewati';
    END;

    IF EXISTS (SELECT 1 FROM pg_extension WHERE extname = 'vector') THEN
        EXECUTE 'ALTER TABLE "Chunk" ADD COLUMN IF NOT EXISTS "embeddingVec" vector(1536)';
    END IF;
END $$;
