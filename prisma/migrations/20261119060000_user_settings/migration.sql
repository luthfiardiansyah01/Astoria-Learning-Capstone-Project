-- Preferensi pengguna: tema, pengurangan gerak, dan pengingat email.
ALTER TABLE "User" ADD COLUMN "theme" TEXT NOT NULL DEFAULT 'system';
ALTER TABLE "User" ADD COLUMN "reducedMotion" BOOLEAN NOT NULL DEFAULT false;
ALTER TABLE "User" ADD COLUMN "emailReminders" BOOLEAN NOT NULL DEFAULT true;
