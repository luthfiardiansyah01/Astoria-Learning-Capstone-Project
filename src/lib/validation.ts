// src/lib/validation.ts
// Skema zod + pembaca body. Pesan galat berbahasa Indonesia.

import { z } from "zod";
import { bodyLimitForPath, readLimitedText } from "./body-limit";
import { MAX_DOC_LENGTH } from "./rag";

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
  /** Honeypot anti-bot: harus kosong. */
  website: z.string().max(200).optional(),
  /** Token Cloudflare Turnstile (opsional bila CAPTCHA belum dikonfigurasi). */
  turnstileToken: z.string().max(4096).optional(),
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
    .max(MAX_DOC_LENGTH, `Dokumen maksimal ${MAX_DOC_LENGTH.toLocaleString("id-ID")} karakter.`),
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

export const taskUpdateSchema = z
  .object({
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
  })
  .refine((value) => Object.keys(value).length > 0, {
    message: "Tidak ada perubahan yang dikirim.",
  });

export const memberAddSchema = z.object({
  name: wajib("Nama", 120),
});

export const inviteResponseSchema = z.object({
  action: z.enum(["accept", "decline"], { message: "Aksi undangan tidak valid." }),
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

export const adminPlanUpdateSchema = z.object({
  plan: z.enum(["free", "premium"], { message: "Paket tidak valid." }),
  /** Durasi Premium dalam hari. Kosong/0 = tanpa batas waktu. */
  days: z.coerce.number().int().min(0).max(3650).optional(),
  resetTrial: z.boolean().optional(),
});

export const adminPaymentUpdateSchema = z.object({
  status: z.enum(["paid", "failed", "expired", "cancelled", "refunded"], {
    message: "Status pembayaran tidak valid.",
  }),
  reason: z
    .string()
    .trim()
    .max(500, "Alasan terlalu panjang (maks 500 karakter).")
    .optional(),
});

export const forgotPasswordSchema = z.object({
  email: z
    .string({ message: "Email wajib diisi." })
    .trim()
    .toLowerCase()
    .max(200, "Email terlalu panjang.")
    .email("Format email tidak valid."),
});

export const resetPasswordSchema = z.object({
  token: z.string().trim().min(10, "Token tidak valid.").max(300, "Token tidak valid."),
  password: z
    .string()
    .min(8, "Password minimal 8 karakter.")
    .max(200, "Password terlalu panjang (maks 200 karakter)."),
});

export const changePasswordSchema = z.object({
  currentPassword: z.string().min(1, "Password saat ini wajib diisi.").max(200),
  newPassword: z
    .string()
    .min(8, "Password baru minimal 8 karakter.")
    .max(200, "Password terlalu panjang (maks 200 karakter)."),
});

export const deleteAccountSchema = z.object({
  password: z.string().min(1, "Password wajib diisi untuk konfirmasi.").max(200),
});

export const profileSettingsSchema = z
  .object({
    name: wajib("Nama", 80).optional(),
    theme: z.enum(["system", "light", "dark"], { message: "Tema tidak valid." }).optional(),
    fontScale: z.enum(["small", "normal", "large", "xlarge"], { message: "Ukuran teks tidak valid." }).optional(),
    reducedMotion: z.boolean().optional(),
    emailReminders: z.boolean().optional(),
  })
  .refine((value) => Object.keys(value).length > 0, {
    message: "Tidak ada perubahan untuk disimpan.",
  });

export const pushSubscribeSchema = z.object({
  endpoint: z.string().url("Endpoint push tidak valid.").max(2000),
  keys: z.object({
    p256dh: z.string().min(1, "Kunci p256dh wajib diisi.").max(500),
    auth: z.string().min(1, "Kunci auth wajib diisi.").max(500),
  }),
});

export const pushUnsubscribeSchema = z.object({
  endpoint: z.string().url("Endpoint push tidak valid.").max(2000),
});

export const broadcastSchema = z.object({
  title: wajib("Judul", 80),
  body: wajib("Isi", 200),
  url: z.string().trim().max(300).optional(),
});

export const checkoutSchema = z.object({
  acceptTerms: z
    .boolean({ message: "Persetujuan Syarat & Ketentuan wajib diisi." })
    .refine((value) => value === true, {
      message: "Setujui Syarat & Ketentuan sebelum melanjutkan pembayaran.",
    }),
});

type ReadResult<T> = { ok: true; data: T } | { ok: false; error: string };

/** Baca + validasi body JSON. Mengembalikan pesan Indonesia pada kegagalan pertama. */
export async function readBody<S extends z.ZodTypeAny>(req: Request, schema: S): Promise<ReadResult<z.infer<S>>> {
  let pathname = "/api";
  try {
    pathname = new URL(req.url).pathname;
  } catch {
    // URL relatif (mis. pada pengujian): pakai batas default.
  }

  const body = await readLimitedText(req, bodyLimitForPath(pathname));
  if (!body.ok) {
    return { ok: false, error: "Ukuran permintaan terlalu besar." };
  }

  let raw: unknown;
  try {
    raw = JSON.parse(body.text);
  } catch {
    return { ok: false, error: "Format permintaan tidak valid." };
  }
  const parsed = schema.safeParse(raw);
  if (!parsed.success) {
    return { ok: false, error: parsed.error.issues[0]?.message ?? "Data yang dikirim tidak valid." };
  }
  return { ok: true, data: parsed.data };
}
