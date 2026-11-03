-- Tambah paket freemium pada pengguna.
ALTER TABLE "User"
  ADD COLUMN "plan" TEXT NOT NULL DEFAULT 'free',
  ADD COLUMN "planExpiresAt" TIMESTAMP(3),
  ADD COLUMN "trialUsedAt" TIMESTAMP(3);
