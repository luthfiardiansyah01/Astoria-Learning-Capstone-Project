import { afterEach, beforeEach, vi } from "vitest";

// Database uji tidak boleh memakai kredensial produksi.
process.env.UPSTASH_REDIS_REST_URL = "";
process.env.UPSTASH_REDIS_REST_TOKEN = "";
delete process.env.MIDTRANS_SERVER_KEY;
delete process.env.MIDTRANS_CLIENT_KEY;
delete process.env.MIDTRANS_IS_PRODUCTION;
delete process.env.XENDIT_SECRET_KEY;
delete process.env.XENDIT_CALLBACK_TOKEN;
delete process.env.PAYMENT_PROVIDER;
delete process.env.NEXT_PUBLIC_APP_URL;
delete process.env.VERCEL_PROJECT_PRODUCTION_URL;
delete process.env.VERCEL_URL;

type AuthUser = Record<string, unknown> | null;
const state = globalThis as typeof globalThis & { __sobadiAuthUser?: AuthUser };
state.__sobadiAuthUser = null;

vi.mock("@/lib/current-user", async () => {
  const { NextResponse } = await import("next/server");
  const getState = () => (globalThis as typeof globalThis & { __sobadiAuthUser?: AuthUser }).__sobadiAuthUser ?? null;

  const unauthorized = () => NextResponse.json({ error: "Belum masuk." }, { status: 401 });
  const forbidden = (message = "Kamu tidak punya akses.") =>
    NextResponse.json({ error: message }, { status: 403 });

  return {
    getCurrentUser: async () => getState(),
    requireUser: async () => {
      const user = getState();
      return user ? { user, res: null } : { user: null, res: unauthorized() };
    },
    requireAdmin: async () => {
      const user = getState();
      if (!user) return { user: null, res: unauthorized() };
      if (user.role !== "admin") return { user: null, res: forbidden("Hanya admin yang bisa mengakses ini.") };
      return { user, res: null };
    },
    unauthorized,
    forbidden,
    canUseDocument: (
      user: { id: string; role: string },
      doc: { uploaderId: string; status: string }
    ) => user.role === "admin" || doc.uploaderId === user.id || doc.status === "approved",
    canManageDocument: (user: { id: string; role: string }, doc: { uploaderId: string }) =>
      user.role === "admin" || doc.uploaderId === user.id,
  };
});

// Email tidak dikirim sungguhan; test dapat memeriksa pemanggilan mock.
vi.mock("@/lib/email", () => ({
  emailConfigured: vi.fn(() => true),
  sendEmail: vi.fn(async () => ({ ok: true })),
}));

// AI tidak pernah dipanggil sungguhan di integration test.
vi.mock("@/lib/ai", async () => {
  const actual = await vi.importActual<typeof import("@/lib/ai")>("@/lib/ai");
  return {
    ...actual,
    chatComplete: vi.fn(async () => "Jawaban mock dari Mentor AI beserta referensi modul."),
    chatJSON: vi.fn(async () => ({})),
    embedTexts: vi.fn(async (texts: string[]) =>
      texts.map(() => Array.from({ length: 8 }, () => 0.1))
    ),
    isAiQuotaError: () => false,
    aiQuotaMessage: () => "Kuota AI mock.",
  };
});

beforeEach(() => {
  process.env.UPSTASH_REDIS_REST_URL = "";
  process.env.UPSTASH_REDIS_REST_TOKEN = "";
});

afterEach(() => {
  state.__sobadiAuthUser = null;
});
