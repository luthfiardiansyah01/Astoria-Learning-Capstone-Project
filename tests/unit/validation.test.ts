import { describe, expect, it } from "vitest";
import {
  adminDecisionSchema,
  adminPaymentUpdateSchema,
  adminPlanUpdateSchema,
  chatSchema,
  documentUploadSchema,
  memberAddSchema,
  mentorQuestionSchema,
  notificationReadSchema,
  projectCreateSchema,
  projectUpdateSchema,
  quizGenerateSchema,
  quizSubmitSchema,
  readBody,
  registerSchema,
  taskCreateSchema,
  taskUpdateSchema,
  teamCreateSchema,
} from "@/lib/validation";
import { MAX_DOC_LENGTH } from "@/lib/rag";

describe("registerSchema", () => {
  it("menerima data pendaftaran yang valid", () => {
    const result = registerSchema.safeParse({
      name: "Raka Pratama",
      email: "raka@example.com",
      password: "rahasia123",
    });
    expect(result.success).toBe(true);
  });

  it("menolak email tidak valid", () => {
    const result = registerSchema.safeParse({
      name: "Raka",
      email: "bukan-email",
      password: "rahasia123",
    });
    expect(result.success).toBe(false);
  });

  it("menolak password kurang dari 8 karakter", () => {
    const result = registerSchema.safeParse({
      name: "Raka",
      email: "raka@example.com",
      password: "pendek",
    });
    expect(result.success).toBe(false);
  });

  it("memangkas spasi pada nama", () => {
    const result = registerSchema.safeParse({
      name: "  Raka  ",
      email: "  raka@example.com ",
      password: "rahasia123",
    });
    expect(result.success && result.data.name).toBe("Raka");
    expect(result.success && result.data.email).toBe("raka@example.com");
  });
});

describe("documentUploadSchema", () => {
  it("menerima dokumen dalam batas", () => {
    const result = documentUploadSchema.safeParse({ fileName: "modul.txt", content: "Materi belajar." });
    expect(result.success).toBe(true);
  });

  it("menolak konten kosong", () => {
    expect(documentUploadSchema.safeParse({ content: "   " }).success).toBe(false);
  });

  it("menolak dokumen melebihi batas maksimum", () => {
    const result = documentUploadSchema.safeParse({ content: "a".repeat(MAX_DOC_LENGTH + 1) });
    expect(result.success).toBe(false);
  });
});

describe("schema Collab", () => {
  it("menolak nama tim kosong", () => {
    expect(teamCreateSchema.safeParse({ name: " " }).success).toBe(false);
  });

  it("menerima proyek dengan deskripsi opsional", () => {
    expect(
      projectCreateSchema.safeParse({ teamId: "team-1", name: "Proyek", description: null }).success
    ).toBe(true);
  });

  it("membatasi XP tugas 1-100", () => {
    expect(taskCreateSchema.safeParse({ title: "Tugas", xpReward: 10 }).success).toBe(true);
    expect(taskCreateSchema.safeParse({ title: "Tugas", xpReward: 0 }).success).toBe(false);
    expect(taskCreateSchema.safeParse({ title: "Tugas", xpReward: 101 }).success).toBe(false);
  });
});

describe("chatSchema", () => {
  it("menerima pertanyaan valid tanpa dokumen", () => {
    expect(chatSchema.safeParse({ question: "Apa itu ekonomi?" }).success).toBe(true);
  });

  it("menolak pertanyaan kosong", () => {
    expect(chatSchema.safeParse({ question: "" }).success).toBe(false);
  });
});

describe("adminPlanUpdateSchema", () => {
  it("menerima paket premium 30 hari", () => {
    const result = adminPlanUpdateSchema.safeParse({ plan: "premium", days: 30 });
    expect(result.success && result.data.days).toBe(30);
  });

  it("mengubah string angka menjadi number", () => {
    const result = adminPlanUpdateSchema.safeParse({ plan: "premium", days: "90" });
    expect(result.success && result.data.days).toBe(90);
  });

  it("menolak paket yang tidak dikenal", () => {
    expect(adminPlanUpdateSchema.safeParse({ plan: "gold" }).success).toBe(false);
  });

  it("menolak durasi negatif atau terlalu besar", () => {
    expect(adminPlanUpdateSchema.safeParse({ plan: "premium", days: -1 }).success).toBe(false);
    expect(adminPlanUpdateSchema.safeParse({ plan: "premium", days: 4000 }).success).toBe(false);
  });
});

describe("schema kuis dan tugas", () => {
  it("mewajibkan dokumen saat generate kuis", () => {
    expect(quizGenerateSchema.safeParse({ documentId: "doc-1" }).success).toBe(true);
    expect(quizGenerateSchema.safeParse({ documentId: "" }).success).toBe(false);
  });

  it("membatasi jawaban kuis", () => {
    expect(quizSubmitSchema.safeParse({ questionId: "q-1", jawaban: "Jawaban saya" }).success).toBe(true);
    expect(quizSubmitSchema.safeParse({ questionId: "q-1", jawaban: "   " }).success).toBe(false);
    expect(quizSubmitSchema.safeParse({ questionId: "q-1", jawaban: "a".repeat(5001) }).success).toBe(false);
  });

  it("menolak update tugas tanpa perubahan", () => {
    expect(taskUpdateSchema.safeParse({}).success).toBe(false);
    expect(taskUpdateSchema.safeParse({ status: "done" }).success).toBe(true);
    expect(taskUpdateSchema.safeParse({ status: "selesai" }).success).toBe(false);
  });

  it("memvalidasi tenggat tugas", () => {
    expect(taskUpdateSchema.safeParse({ dueDate: "2026-12-31" }).success).toBe(true);
    expect(taskUpdateSchema.safeParse({ dueDate: "bukan-tanggal" }).success).toBe(false);
  });
});

describe("schema update dan moderasi", () => {
  it("menolak update proyek tanpa field", () => {
    expect(projectUpdateSchema.safeParse({}).success).toBe(false);
    expect(projectUpdateSchema.safeParse({ name: "Nama baru" }).success).toBe(true);
  });

  it("mewajibkan nama anggota", () => {
    expect(memberAddSchema.safeParse({ name: "Budi" }).success).toBe(true);
    expect(memberAddSchema.safeParse({ name: " " }).success).toBe(false);
  });

  it("menerima ids notifikasi opsional", () => {
    expect(notificationReadSchema.safeParse({}).success).toBe(true);
    expect(notificationReadSchema.safeParse({ ids: ["n1", "n2"] }).success).toBe(true);
    expect(notificationReadSchema.safeParse({ ids: Array(101).fill("n") }).success).toBe(false);
  });

  it("membatasi keputusan admin", () => {
    expect(adminDecisionSchema.safeParse({ documentId: "d1", decision: "approved" }).success).toBe(true);
    expect(adminDecisionSchema.safeParse({ documentId: "d1", decision: "publish" }).success).toBe(false);
  });

  it("membatasi status pembayaran manual", () => {
    expect(adminPaymentUpdateSchema.safeParse({ status: "paid" }).success).toBe(true);
    expect(adminPaymentUpdateSchema.safeParse({ status: "pending" }).success).toBe(false);
  });

  it("membatasi panjang pertanyaan mentor", () => {
    expect(mentorQuestionSchema.safeParse({ question: "Apa itu inflasi?" }).success).toBe(true);
    expect(mentorQuestionSchema.safeParse({ question: "" }).success).toBe(false);
  });
});

describe("readBody", () => {
  it("mengembalikan data valid", async () => {
    const req = new Request("http://localhost/api/test", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name: "Tim Baru" }),
    });
    const result = await readBody(req, teamCreateSchema);
    expect(result).toEqual({ ok: true, data: { name: "Tim Baru" } });
  });

  it("menolak JSON rusak", async () => {
    const req = new Request("http://localhost/api/test", { method: "POST", body: "{rusak" });
    const result = await readBody(req, teamCreateSchema);
    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.error).toContain("tidak valid");
  });

  it("menolak body yang tidak sesuai skema", async () => {
    const req = new Request("http://localhost/api/test", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name: "" }),
    });
    const result = await readBody(req, teamCreateSchema);
    expect(result.ok).toBe(false);
  });
});
