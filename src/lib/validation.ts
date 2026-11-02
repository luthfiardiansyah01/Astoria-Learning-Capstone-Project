// src/lib/validation.ts
// Skema zod + pembaca body. Pesan galat berbahasa Indonesia.

import { z } from "zod";

const wajib = (label: string, max: number) =>
  z
    .string({ message: `${label} wajib diisi.` })
    .trim()
    .min(1, `${label} wajib diisi.`)
    .max(max, `${label} terlalu panjang (maks ${max} karakter).`);
const opsional = (label: string, max: number) =>
  z
    .string()
    .trim()
    .max(max, `${label} terlalu panjang (maks ${max} karakter).`)
    .nullish();

export const registerSchema = z.object({
  name: wajib("Nama", 80),
  email: z.string().trim().email("Format email tidak valid.").max(160, "Email terlalu panjang."),
  password: z
    .string()
    .min(8, "Password minimal 8 karakter.")
    .max(200, "Password terlalu panjang (maks 200 karakter)."),
});

export const chatSchema = z.object({
  documentId: z.string().trim().max(64).nullish(),
  question: z.string().min(1, "Pertanyaan wajib diisi.").max(4000, "Pertanyaan terlalu panjang (maks 4000 karakter)."),
});

export const quizGenerateSchema = z.object({
  documentId: z.string().trim().min(1, "Pilih dokumen dulu ya!").max(64),
});

export const quizSubmitSchema = z.object({
  questionId: wajib("Soal", 64),
  jawaban: z
    .string()
    .trim()
    .min(1, "Tulis jawaban kamu dulu ya sebelum mengirim!")
    .max(5000, "Jawaban terlalu panjang (maks 5000 karakter)."),
});

export const documentUploadSchema = z.object({
  fileName: z.string().trim().max(200, "Nama berkas terlalu panjang.").optional(),
  content: z
    .string()
    .trim()
    .min(1, "Konten dokumen kosong. Tempel teks modul kamu dulu ya!")
    .max(1_000_000, "Dokumen terlalu besar."),
});

export const teamCreateSchema = z.object({
  name: wajib("Nama tim", 80),
});

export const projectCreateSchema = z.object({
  teamId: wajib("Tim", 64),
  name: wajib("Nama proyek", 120),
  description: opsional("Deskripsi", 2000),
});

export const projectUpdateSchema = z
  .object({
    name: z.string().trim().min(1, "Nama proyek tidak boleh kosong.").max(120).optional(),
    description: opsional("Deskripsi", 2000),
  })
  .refine((v) => v.name !== undefined || v.description !== undefined, {
    message: "Tidak ada perubahan yang dikirim.",
  });

export const taskCreateSchema = z.object({
  title: wajib("Judul tugas", 200),
  description: opsional("Deskripsi", 5000),
  assigneeId: opsional("Penerima tugas", 64),
  xpReward: z.coerce.number().int().min(1, "XP minimal 1.").max(100, "XP maksimal 100.").optional(),
});

export const taskUpdateSchema = z.object({
  status: z.enum(["todo", "in_progress", "review", "done"], { message: "Status tidak valid." }).optional(),
  order: z.coerce.number().int().min(0).optional(),
  assigneeId: opsional("Penerima tugas", 64),
  title: z.string().trim().min(1, "Judul tugas tidak boleh kosong.").max(200).optional(),
  description: opsional("Deskripsi", 5000),
  documentId: opsional("Dokumen", 64),
  dueDate: z
    .string()
    .refine((v) => v === "" || !Number.isNaN(new Date(v).getTime()), "Tanggal tenggat tidak valid.")
    .nullish(),
});

export const memberAddSchema = z.object({
  name: wajib("Nama", 120),
});

export const notificationReadSchema = z.object({
  ids: z.array(z.string().min(1)).max(100).optional(),
});

export const adminDecisionSchema = z.object({
  documentId: wajib("Dokumen", 64),
  decision: z.enum(["approved", "pending", "rejected"], { message: "Keputusan tidak valid." }),
});

export const mentorQuestionSchema = z.object({
  question: z.string().min(1, "Pertanyaan wajib diisi.").max(4000, "Pertanyaan terlalu panjang (maks 4000 karakter)."),
});

type ReadResult<T> = { ok: true; data: T } | { ok: false; error: string };

/** Baca + validasi body JSON. Mengembalikan pesan Indonesia pada kegagalan pertama. */
export async function readBody<S extends z.ZodTypeAny>(req: Request, schema: S): Promise<ReadResult<z.infer<S>>> {
  let raw: unknown;
  try {
    raw = await req.json();
  } catch {
    return { ok: false, error: "Format permintaan tidak valid." };
  }
  const parsed = schema.safeParse(raw);
  if (!parsed.success) {
    return { ok: false, error: parsed.error.issues[0]?.message ?? "Data yang dikirim tidak valid." };
  }
  return { ok: true, data: parsed.data };
}
