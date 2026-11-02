// GET /api/admin/analytics — statistik platform + AI Analytics Summarizer (Seksi 5.2)

import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { ANALYTICS_SUMMARIZER_PROMPT, PARAMS } from "@/lib/prompts";
import { chatComplete } from "@/lib/ai";
import { requireAdmin } from "@/lib/current-user";
import { guardAi } from "@/lib/rate-limit";

export const maxDuration = 60;

export async function GET() {
  try {
    const auth = await requireAdmin();
    if (auth.res) return auth.res;
    const limited = await guardAi(auth.user.id);
    if (limited) return limited;
    const oneWeekAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);

    const [totalUsers, docsThisWeek, totalChats, docStats, attemptStats] = await Promise.all([
      db.user.count({ where: { role: "mahasiswa" } }),
      db.document.count({ where: { createdAt: { gte: oneWeekAgo } } }),
      db.chatMessage.count({ where: { role: "user" } }),
      db.document.findMany({
        include: {
          _count: { select: { chatMessages: true, quizAttempts: true } },
          chatMessages: { where: { role: "user" }, select: { content: true } },
        },
      }),
      db.quizAttempt.findMany({
        include: { question: { select: { soal: true } }, document: { select: { fileName: true } } } ,
      }),
    ]);

    // Dokumen paling populer (interaksi chat terbanyak)
    const popular = [...docStats]
      .sort((a, b) => b._count.chatMessages - a._count.chatMessages)
      .slice(0, 3)
      .map((d) => ({
        fileName: d.fileName,
        status: d.status,
        interaksi: d._count.chatMessages,
        kuis: d._count.quizAttempts,
      }));

    // Topik yang sering ditanyakan (frekuensi kata dari pertanyaan)
    const wordFreq = new Map<string, number>();
    for (const d of docStats) {
      for (const m of d.chatMessages) {
        for (const w of m.content.toLowerCase().split(/\s+/)) {
          const clean = w.replace(/[^\p{L}\p{N}]/gu, "");
          if (clean.length > 4) wordFreq.set(clean, (wordFreq.get(clean) ?? 0) + 1);
        }
      }
    }
    const topTopics = [...wordFreq.entries()]
      .sort((a, b) => b[1] - a[1])
      .slice(0, 5)
      .map(([w, c]) => ({ kata: w, jumlah: c }));

    // Skor rata-rata kuis
    const avgQuiz = attemptStats.length
      ? Math.round(attemptStats.reduce((a, b) => a + b.skor, 0) / attemptStats.length)
      : 0;

    const statusBreakdown = {
      approved: docStats.filter((d) => d.status === "approved").length,
      pending: docStats.filter((d) => d.status === "pending").length,
      rejected: docStats.filter((d) => d.status === "rejected").length,
    };

    // ── AI Analytics Summarizer (Seksi 5.2) ──
    let insight: string | null = null;
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
      console.error("[/api/admin/analytics] summarizer gagal:", e);
      const topDoc = popular[0]?.fileName ?? "belum ada";
      const topTopic = topTopics[0]?.kata ?? "belum ada";
      insight = [
        `1. Ringkasan performa: ${totalUsers} mahasiswa, ${docStats.length} dokumen, dan ${totalChats} interaksi chat.`,
        `2. Dokumen paling populer: ${topDoc}. Topik yang paling sering ditanyakan: ${topTopic}.`,
        `3. Rata-rata skor kuis: ${avgQuiz}. Dokumen menunggu review: ${statusBreakdown.pending}.`,
        "4. Rekomendasi: tinjau dokumen berstatus review, lengkapi materi pada topik tersibuk, dan dorong mahasiswa menyelesaikan kuis.",
        "",
        "_Ringkasan lokal — layanan AI sedang tidak tersedia (kuota/limit)._",
      ].join("\n");
    }

    return NextResponse.json({
      analytics: {
        totalUsers,
        docsThisWeek,
        totalChats,
        totalDocuments: docStats.length,
        totalQuiz: attemptStats.length,
        avgQuiz,
        statusBreakdown,
        popular,
        topTopics,
        insight,
      },
    });
  } catch (e) {
    console.error("[/api/admin/analytics]", e);
    return NextResponse.json({ error: "Gagal memuat analitik" }, { status: 500 });
  }
}
