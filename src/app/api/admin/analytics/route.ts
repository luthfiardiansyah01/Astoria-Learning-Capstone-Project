import { logger } from "@/lib/logger";
// GET /api/admin/analytics — statistik platform.
// Insight AI hanya dibuat saat diminta (?insight=1) agar buka panel admin tetap cepat.
import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { ANALYTICS_SUMMARIZER_PROMPT, PARAMS } from "@/lib/prompts";
import { chatComplete } from "@/lib/ai";
import { requireAdmin } from "@/lib/current-user";
import { guardAi } from "@/lib/rate-limit";
import { effectivePlan } from "@/lib/plans";

export const maxDuration = 60;

export async function GET(req: NextRequest) {
  try {
    const auth = await requireAdmin();
    if (auth.res) return auth.res;

    const withInsight = new URL(req.url).searchParams.get("insight") === "1";
    const oneWeekAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);

    const [totalUsers, docsThisWeek, totalChats, documents, attemptStats, recentQuestions] =
      await Promise.all([
        db.user.count({ where: { role: "mahasiswa" } }),
        db.document.count({ where: { createdAt: { gte: oneWeekAgo } } }),
        db.chatMessage.count({ where: { role: "user" } }),
        db.document.findMany({
          select: {
            id: true,
            fileName: true,
            status: true,
            _count: { select: { chatMessages: true, quizAttempts: true } },
          },
        }),
        db.quizAttempt.aggregate({
          _count: { _all: true },
          _avg: { skor: true },
        }),
        // Batasi ke pertanyaan terbaru agar tidak memuat seluruh riwayat chat.
        db.chatMessage.findMany({
          where: { role: "user" },
          select: { content: true },
          orderBy: { createdAt: "desc" },
          take: 500,
        }),
      ]);

    // Dokumen paling populer (interaksi chat terbanyak)
    const popular = [...documents]
      .sort((a, b) => b._count.chatMessages - a._count.chatMessages)
      .slice(0, 3)
      .map((d) => ({
        fileName: d.fileName,
        status: d.status,
        interaksi: d._count.chatMessages,
        kuis: d._count.quizAttempts,
      }));

    // Topik yang sering ditanyakan (frekuensi kata dari pertanyaan terbaru)
    const wordFreq = new Map<string, number>();
    for (const m of recentQuestions) {
      for (const w of m.content.toLowerCase().split(/\s+/)) {
        const clean = w.replace(/[^\p{L}\p{N}]/gu, "");
        if (clean.length > 4) wordFreq.set(clean, (wordFreq.get(clean) ?? 0) + 1);
      }
    }
    const topTopics = [...wordFreq.entries()]
      .sort((a, b) => b[1] - a[1])
      .slice(0, 5)
      .map(([w, c]) => ({ kata: w, jumlah: c }));

    const totalQuiz = attemptStats._count._all;
    const avgQuiz = Math.round(attemptStats._avg.skor ?? 0);

    const statusBreakdown = {
      approved: documents.filter((d) => d.status === "approved").length,
      pending: documents.filter((d) => d.status === "pending").length,
      rejected: documents.filter((d) => d.status === "rejected").length,
    };

    // ── AI Analytics Summarizer (Seksi 5.2), hanya saat diminta ──
    let insight: string | null = null;
    if (withInsight) {
      const limited = await guardAi(auth.user.id, effectivePlan(auth.user), auth.user);
      if (limited) return limited;

      try {
        insight = await chatComplete(
          [
            { role: "system", content: ANALYTICS_SUMMARIZER_PROMPT },
            {
              role: "user",
              content: `DATA INPUT:
- Total mahasiswa aktif        : ${totalUsers}
- Dokumen diunggah minggu ini  : ${docsThisWeek}
- Total interaksi chat         : ${totalChats}
- Topik paling banyak ditanya  : ${topTopics.map((t) => t.kata).join(", ") || "belum ada"}
- Rata-rata sesi per mahasiswa : ${totalUsers ? Math.round((totalChats / totalUsers) * 3) : 0} menit
- Rata-rata skor kuis           : ${avgQuiz}
- Dokumen paling populer        : ${popular.map((p) => `${p.fileName} (${p.interaksi} interaksi)`).join("; ") || "belum ada"}
- Status dokumen: ${statusBreakdown.approved} aktif, ${statusBreakdown.pending} review, ${statusBreakdown.rejected} ditolak`,
            },
          ],
          PARAMS.admin_ops
        );
      } catch (e) {
        logger.error("[/api/admin/analytics] summarizer gagal:", { error: e });
        const topDoc = popular[0]?.fileName ?? "belum ada";
        const topTopic = topTopics[0]?.kata ?? "belum ada";
        insight = [
          `1. Ringkasan performa: ${totalUsers} mahasiswa, ${documents.length} dokumen, dan ${totalChats} interaksi chat.`,
          `2. Dokumen paling populer: ${topDoc}. Topik yang paling sering ditanyakan: ${topTopic}.`,
          `3. Rata-rata skor kuis: ${avgQuiz}. Dokumen menunggu review: ${statusBreakdown.pending}.`,
          "4. Rekomendasi: tinjau dokumen berstatus review, lengkapi materi pada topik tersibuk, dan dorong mahasiswa menyelesaikan kuis.",
          "",
          "_Ringkasan lokal — layanan AI sedang tidak tersedia (kuota/limit)._",
        ].join("\n");
      }
    }

    return NextResponse.json({
      analytics: {
        totalUsers,
        docsThisWeek,
        totalChats,
        totalDocuments: documents.length,
        totalQuiz,
        avgQuiz,
        statusBreakdown,
        popular,
        topTopics,
        insight,
      },
    });
  } catch (e) {
    logger.error("[/api/admin/analytics]", { error: e });
    return NextResponse.json({ error: "Gagal memuat analitik" }, { status: 500 });
  }
}
