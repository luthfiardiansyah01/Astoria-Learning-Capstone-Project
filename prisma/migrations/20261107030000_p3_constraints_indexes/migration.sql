-- P3: index komposit, unique urutan tugas, CHECK constraint, dan retensi Payment.
-- Rapikan urutan tugas per kolom sebelum unique index dibuat.
WITH ranked AS (
    SELECT
        id,
        ROW_NUMBER() OVER (
            PARTITION BY "projectId", status
            ORDER BY "order", "createdAt", id
        ) - 1 AS new_order
    FROM "Task"
)
UPDATE "Task" t
SET "order" = ranked.new_order
FROM ranked
WHERE t.id = ranked.id
  AND t."order" IS DISTINCT FROM ranked.new_order;

CREATE UNIQUE INDEX "Task_projectId_status_order_key"
    ON "Task"("projectId", status, "order");

CREATE INDEX "Payment_userId_status_createdAt_idx"
    ON "Payment"("userId", status, "createdAt");
CREATE INDEX "Payment_createdAt_idx" ON "Payment"("createdAt");
CREATE INDEX "QuizAttempt_userId_questionId_idx"
    ON "QuizAttempt"("userId", "questionId");
CREATE INDEX "Document_status_createdAt_idx"
    ON "Document"("status", "createdAt");

-- Riwayat pembayaran tidak boleh hilang saat user dihapus.
ALTER TABLE "Payment" DROP CONSTRAINT "Payment_userId_fkey";
ALTER TABLE "Payment" ADD CONSTRAINT "Payment_userId_fkey"
    FOREIGN KEY ("userId") REFERENCES "User"("id")
    ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE "User"
    ADD CONSTRAINT "User_role_check" CHECK ("role" IN ('mahasiswa', 'admin'));
ALTER TABLE "User"
    ADD CONSTRAINT "User_plan_check" CHECK ("plan" IN ('free', 'premium'));
ALTER TABLE "Payment"
    ADD CONSTRAINT "Payment_status_check"
    CHECK (status IN ('pending', 'paid', 'failed', 'expired', 'refunded', 'cancelled'));
ALTER TABLE "TeamMember"
    ADD CONSTRAINT "TeamMember_role_check" CHECK ("role" IN ('owner', 'member'));
ALTER TABLE "Task"
    ADD CONSTRAINT "Task_status_check"
    CHECK (status IN ('todo', 'in_progress', 'review', 'done'));
ALTER TABLE "Document"
    ADD CONSTRAINT "Document_status_check"
    CHECK (status IN ('pending', 'approved', 'rejected'));
ALTER TABLE "TeamInvite"
    ADD CONSTRAINT "TeamInvite_status_check"
    CHECK (status IN ('pending', 'accepted', 'declined'));
