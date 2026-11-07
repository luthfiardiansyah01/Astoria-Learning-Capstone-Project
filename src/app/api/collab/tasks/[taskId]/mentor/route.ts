import { logger } from "@/lib/logger";
// GET  /api/collab/tasks/[taskId]/mentor — riwayat chat mentor untuk task ini
// POST /api/collab/tasks/[taskId]/mentor — kirim pertanyaan ke Mentor AI kontekstual

import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { getCurrentUser, canUseDocument } from "@/lib/current-user";
import { assertTeamMember, logActivity, ForbiddenError } from "@/lib/collab";
import { chatComplete, isAiQuotaError, aiQuotaMessage } from "@/lib/ai";
import { TASK_MENTOR_SYSTEM_PROMPT, buildTaskMentorUserTurn, buildRagContext, PARAMS } from "@/lib/prompts";
import { retrieveForDocument } from "@/lib/rag-semantic";
import { checkTeamBadges } from "@/lib/collab-badges";
import { FALLBACK_RESPONSES } from "@/lib/fallback";
import { preprocessUserInput } from "@/lib/fallback";
import { guardAi } from "@/lib/rate-limit";
import { effectivePlan } from "@/lib/plans";
import { mentorQuestionSchema, readBody } from "@/lib/validation";

export const maxDuration = 60;

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ taskId: string }> }
) {
  try {
    const user = await getCurrentUser();
    if (!user) return NextResponse.json({ error: "Belum masuk." }, { status: 401 });

    const { taskId } = await params;
    const task = await db.task.findUnique({ where: { id: taskId }, include: { project: true } });
    if (!task) return NextResponse.json({ error: "Tugas tidak ditemukan." }, { status: 404 });
    await assertTeamMember(user.id, task.project.teamId);

    const messages = await db.taskChatMessage.findMany({
      where: { taskId },
      orderBy: { createdAt: "asc" },
      include: { user: { select: { id: true, name: true } } },
    });

    return NextResponse.json({ messages });
  } catch (e) {
    if (e instanceof ForbiddenError) {
      return NextResponse.json({ error: e.message }, { status: 403 });
    }
    logger.error("[/api/collab/tasks/[taskId]/mentor GET]", { error: e });
    return NextResponse.json({ error: FALLBACK_RESPONSES.api_error }, { status: 500 });
  }
}

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ taskId: string }> }
) {
  try {
    const user = await getCurrentUser();
    if (!user) return NextResponse.json({ error: "Belum masuk." }, { status: 401 });

    const limited = await guardAi(user.id, effectivePlan(user));
    if (limited) return limited;

    const { taskId } = await params;
    const task = await db.task.findUnique({
      where: { id: taskId },
      include: { project: { include: { team: true } }, document: true },
    });
    if (!task) return NextResponse.json({ error: "Tugas tidak ditemukan." }, { status: 404 });
    await assertTeamMember(user.id, task.project.teamId);

    const parsed = await readBody(req, mentorQuestionSchema);
    if (!parsed.ok) return NextResponse.json({ error: parsed.error }, { status: 400 });
    let question: string;
    try {
      question = preprocessUserInput(parsed.data.question);
    } catch (e) {
      return NextResponse.json({ error: (e as Error).message }, { status: 400 });
    }

    const history = await db.taskChatMessage.findMany({
      where: { taskId },
      orderBy: { createdAt: "desc" },
      take: 10,
    });

    await db.taskChatMessage.create({
      data: { taskId, userId: user.id, role: "user", content: question },
    });

    // Konteks dokumen modul (jika task ditautkan ke dokumen) → RAG hybrid.
    // Ulangi cek kepemilikan: dokumen bisa saja ditautkan sebelum aturan akses berubah.
    let systemPrompt = TASK_MENTOR_SYSTEM_PROMPT;
    if (task.document) {
      if (!canUseDocument(user, task.document)) {
        return NextResponse.json(
          { error: "Kamu tidak punya akses ke dokumen ini." },
          { status: 403 }
        );
      }
      const { context, isPartial } = await retrieveForDocument(
        task.document.id,
        `${task.title} ${question}`
      );
      systemPrompt +=
        "\n\n" +
        buildRagContext({
          namaFile: task.document.fileName,
          namaMahasiswa: user.name,
          wordCount: task.document.wordCount,
          chunkContent: context,
          isPartial,
        }) +
        "\nGunakan konteks dokumen di atas sebagai rujukan utama saat relevan dengan task.";
    }

    let reply: string;
    try {
      reply = await chatComplete(
        [
          { role: "system", content: systemPrompt },
          {
            role: "user",
            content: buildTaskMentorUserTurn({
              teamName: task.project.team.name,
              projectName: task.project.name,
              taskTitle: task.title,
              taskDescription: task.description,
              chatHistory: history.reverse().map((m) => ({ role: m.role, content: m.content })),
              question,
            }),
          },
        ],
        PARAMS.task_mentor,
        { cache: true }
      );
    } catch (e) {
      logger.error("[/api/collab/tasks/[taskId]/mentor] AI gagal:", { error: e });
      if (isAiQuotaError(e)) {
        return NextResponse.json(
          { error: aiQuotaMessage(), code: "ai_quota" },
          { status: 503 }
        );
      }
      return NextResponse.json(
        { error: FALLBACK_RESPONSES.api_error, code: "api_error" },
        { status: 500 }
      );
    }

    const assistantMessage = await db.taskChatMessage.create({
      data: { taskId, userId: user.id, role: "assistant", content: reply },
    });

    await logActivity({
      teamId: task.project.teamId,
      projectId: task.projectId,
      taskId: task.id,
      userId: user.id,
      type: "ai_mentor_used",
      // Jangan simpan pertanyaan lengkap: activity feed bisa dibaca seluruh tim.
      payload: { questionLength: question.length },
    });

    const newBadges = await checkTeamBadges(task.project.teamId, user.id);

    return NextResponse.json({ message: assistantMessage, newBadges });
  } catch (e) {
    if (e instanceof ForbiddenError) {
      return NextResponse.json({ error: e.message }, { status: 403 });
    }
    logger.error("[/api/collab/tasks/[taskId]/mentor POST]", { error: e });
    return NextResponse.json({ error: FALLBACK_RESPONSES.api_error }, { status: 500 });
  }
}
