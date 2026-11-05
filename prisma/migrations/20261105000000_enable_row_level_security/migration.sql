-- Aktifkan Row Level Security pada semua tabel public.
-- Akses aplikasi tetap melalui Prisma dengan role postgres (bypass RLS).
-- Akses anon/authenticated via PostgREST tanpa policy akan ditolak/0 baris.
ALTER TABLE "public"."_prisma_migrations" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "public"."User" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "public"."Team" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "public"."TeamBadge" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "public"."Notification" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "public"."TeamMember" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "public"."Project" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "public"."Task" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "public"."Document" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "public"."TaskChatMessage" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "public"."ActivityEvent" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "public"."Chunk" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "public"."ChatMessage" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "public"."QuizQuestion" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "public"."QuizAttempt" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "public"."Badge" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "public"."Payment" ENABLE ROW LEVEL SECURITY;
