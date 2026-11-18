-- P1 performa: index untuk daftar dokumen berurutan createdAt.
-- Composite (uploaderId, createdAt) menggantikan index uploaderId tunggal
-- karena tetap melayani filter uploader (prefix) sekaligus urutan waktu.

DROP INDEX IF EXISTS "Document_uploaderId_idx";

CREATE INDEX "Document_createdAt_idx" ON "Document"("createdAt");
CREATE INDEX "Document_uploaderId_createdAt_idx" ON "Document"("uploaderId", "createdAt");
