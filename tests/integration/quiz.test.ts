import { beforeEach, describe, expect, it, vi } from "vitest";
import { db } from "@/lib/db";
import { chatJSON } from "@/lib/ai";
import { createDocument, createUser, jsonRequest, resetDb, setAuthUser } from "./helpers";
import * as quizGenerateRoute from "@/app/api/quiz/generate/route";
import * as quizSubmitRoute from "@/app/api/quiz/submit/route";

const generated = {
  soal: [
    { soal: "Apa itu permintaan?", kunci: "Keinginan membeli barang.", tingkat: "Dasar" },
    { soal: "Apa itu penawaran?", kunci: "Jumlah barang yang dijual.", tingkat: "Menengah" },
    { soal: "Apa hukum permintaan?", kunci: "Harga naik, permintaan turun.", tingkat: "Lanjut" },
    { soal: "Apa itu pasar?", kunci: "Tempat bertemunya penjual dan pembeli.", tingkat: "Dasar" },
    { soal: "Apa itu harga?", kunci: "Nilai tukar barang.", tingkat: "Menengah" },
  ],
};

const evaluation = {
  skor: 150,
  xp_diperoleh: 999,
  badge_baru: "Pemberani",
  feedback: "Jawabanmu baik.",
  koreksi: "Tambahkan contoh.",
  level_naik: true,
};

beforeEach(async () => {
  await resetDb();
  setAuthUser(null);
  vi.mocked(chatJSON).mockReset();
});

describe("POST /api/quiz/generate", () => {
  it("menolak tanpa sesi", async () => {
    const res = await quizGenerateRoute.POST(
      jsonRequest("/api/quiz/generate", "POST", { documentId: "x" })
    );
    expect(res.status).toBe(401);
  });

  it("menolak body tanpa documentId", async () => {
    const user = await createUser();
    setAuthUser(user);
    const res = await quizGenerateRoute.POST(
      jsonRequest("/api/quiz/generate", "POST", {})
    );
    expect(res.status).toBe(400);
  });

  it("menolak dokumen milik pengguna lain yang belum approved", async () => {
    const owner = await createUser();
    const other = await createUser();
    const doc = await createDocument(owner.id, { status: "pending" });
    setAuthUser(other);
    const res = await quizGenerateRoute.POST(
      jsonRequest("/api/quiz/generate", "POST", { documentId: doc.id })
    );
    expect(res.status).toBe(403);
  });

  it("membuat maksimal 5 soal dari dokumen", async () => {
    const user = await createUser();
    const doc = await createDocument(user.id);
    setAuthUser(user);
    vi.mocked(chatJSON).mockResolvedValueOnce(generated as never);

    const res = await quizGenerateRoute.POST(
      jsonRequest("/api/quiz/generate", "POST", { documentId: doc.id })
    );
    const body = (await res.json()) as { questions: { id: string; tingkat: string }[] };
    expect(res.status).toBe(200);
    expect(body.questions).toHaveLength(5);
    expect(body.questions[0].tingkat).toBe("Dasar");

    const count = await db.quizQuestion.count({ where: { documentId: doc.id } });
    expect(count).toBe(5);
  });
});

describe("POST /api/quiz/submit", () => {
  async function setupQuestion(options: { tingkat?: string; ownerId?: string } = {}) {
    const user = await createUser({
      xp: 90,
      level: 1,
      streakDays: 2,
      lastActive: new Date(Date.now() - 24 * 60 * 60 * 1000),
    });
    const doc = await createDocument(options.ownerId ?? user.id);
    const question = await db.quizQuestion.create({
      data: {
        documentId: doc.id,
        soal: "Apa itu permintaan?",
        kunci: "Keinginan membeli.",
        tingkat: options.tingkat ?? "Menengah",
      },
    });
    return { user, doc, question };
  }

  it("menolak tanpa sesi", async () => {
    const res = await quizSubmitRoute.POST(
      jsonRequest("/api/quiz/submit", "POST", { questionId: "x", jawaban: "Jawaban" })
    );
    expect(res.status).toBe(401);
  });

  it("mengembalikan 404 untuk soal yang tidak ada", async () => {
    const user = await createUser();
    setAuthUser(user);
    const res = await quizSubmitRoute.POST(
      jsonRequest("/api/quiz/submit", "POST", { questionId: "tidak-ada", jawaban: "Jawaban" })
    );
    expect(res.status).toBe(404);
  });

  it("menolak soal dari dokumen pengguna lain", async () => {
    const owner = await createUser();
    const other = await createUser();
    const doc = await createDocument(owner.id, { status: "pending" });
    const question = await db.quizQuestion.create({
      data: { documentId: doc.id, soal: "Soal", kunci: "Kunci", tingkat: "Dasar" },
    });
    setAuthUser(other);

    const res = await quizSubmitRoute.POST(
      jsonRequest("/api/quiz/submit", "POST", { questionId: question.id, jawaban: "Jawaban" })
    );
    expect(res.status).toBe(403);
  });

  it("mengabaikan skor/XP dari klien dan memakai batas server", async () => {
    const { user, question } = await setupQuestion({ tingkat: "Lanjut" });
    setAuthUser(user);
    vi.mocked(chatJSON).mockResolvedValueOnce(evaluation as never);

    const res = await quizSubmitRoute.POST(
      jsonRequest("/api/quiz/submit", "POST", {
        questionId: question.id,
        jawaban: "Permintaan adalah keinginan membeli.",
        skor: 1,
        xp: 1,
      })
    );
    const body = (await res.json()) as {
      result: { skor: number; xpDiperoleh: number; badgeBaru: string; levelNaik: boolean };
    };
    expect(res.status).toBe(200);
    expect(body.result.skor).toBe(100);
    expect(body.result.xpDiperoleh).toBe(20);
    expect(body.result.badgeBaru).toBe("Pemberani");
    expect(body.result.levelNaik).toBe(true);

    const updated = await db.user.findUniqueOrThrow({ where: { id: user.id } });
    expect(updated.xp).toBe(110);
    expect(updated.level).toBe(2);
    expect(updated.streakDays).toBe(3);
    expect(await db.badge.count({ where: { userId: user.id, name: "Pemberani" } })).toBe(1);
  });

  it("tidak menggandakan badge pada submit berikutnya", async () => {
    const { user, question } = await setupQuestion({ tingkat: "Lanjut" });
    setAuthUser(user);
    vi.mocked(chatJSON).mockResolvedValue(evaluation as never);

    await quizSubmitRoute.POST(
      jsonRequest("/api/quiz/submit", "POST", { questionId: question.id, jawaban: "Jawaban 1" })
    );
    const afterFirst = await db.user.findUniqueOrThrow({ where: { id: user.id } });
    setAuthUser(afterFirst);
    await quizSubmitRoute.POST(
      jsonRequest("/api/quiz/submit", "POST", { questionId: question.id, jawaban: "Jawaban 2" })
    );

    const afterSecond = await db.user.findUniqueOrThrow({ where: { id: user.id } });
    expect(afterSecond.xp).toBe(130);
    expect(await db.badge.count({ where: { userId: user.id, name: "Pemberani" } })).toBe(1);
    expect(await db.quizAttempt.count({ where: { userId: user.id } })).toBe(2);
  });

  it("menampilkan kunci saat skor rendah", async () => {
    const { user, question } = await setupQuestion();
    setAuthUser(user);
    vi.mocked(chatJSON).mockResolvedValueOnce({
      ...evaluation,
      skor: 40,
      xp_diperoleh: 5,
      badge_baru: null,
    } as never);

    const res = await quizSubmitRoute.POST(
      jsonRequest("/api/quiz/submit", "POST", { questionId: question.id, jawaban: "Kurang tepat" })
    );
    const body = (await res.json()) as { result: { skor: number; kunci: string | null } };
    expect(body.result.skor).toBe(40);
    expect(body.result.kunci).toBe(question.kunci);
  });
});
