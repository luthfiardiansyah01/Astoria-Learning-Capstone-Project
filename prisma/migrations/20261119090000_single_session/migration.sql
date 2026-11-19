-- Satu sesi aktif per akun. Login baru menggantikan sesi lama.
ALTER TABLE "User" ADD COLUMN "activeSessionId" TEXT;
ALTER TABLE "User" ADD COLUMN "activeSessionAt" TIMESTAMP(3);
ALTER TABLE "User" ADD COLUMN "activeDevice" TEXT;
ALTER TABLE "User" ADD COLUMN "sessionConflictCount" INTEGER NOT NULL DEFAULT 0;
ALTER TABLE "User" ADD COLUMN "sessionConflictAt" TIMESTAMP(3);
