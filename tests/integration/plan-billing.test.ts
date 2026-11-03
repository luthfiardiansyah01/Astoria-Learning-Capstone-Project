import { beforeEach, describe, expect, it } from "vitest";
import { db } from "@/lib/db";
import { createUser, jsonRequest, resetDb, setAuthUser } from "./helpers";
import * as planRoute from "@/app/api/plan/route";
import * as profileRoute from "@/app/api/profile/route";
import * as aiUsageRoute from "@/app/api/ai-usage/route";
import * as billingConfigRoute from "@/app/api/billing/config/route";
import * as checkoutRoute from "@/app/api/billing/checkout/route";
import * as paymentsRoute from "@/app/api/billing/payments/route";
import * as midtransWebhook from "@/app/api/billing/webhook/midtrans/route";

beforeEach(async () => {
  await resetDb();
  setAuthUser(null);
});

describe("GET /api/plan", () => {
  it("menolak tanpa sesi", async () => {
    const res = await planRoute.GET();
    expect(res.status).toBe(401);
  });

  it("mengembalikan paket Free dan batasnya", async () => {
    const user = await createUser({ plan: "free" });
    setAuthUser(user);
    const res = await planRoute.GET();
    const body = (await res.json()) as { plan: string; limits: { aiPerDay: number } };
    expect(res.status).toBe(200);
    expect(body.plan).toBe("free");
    expect(body.limits.aiPerDay).toBe(30);
  });

  it("mengembalikan Free untuk Premium yang sudah kedaluwarsa", async () => {
    const user = await createUser({
      plan: "premium",
      planExpiresAt: new Date(Date.now() - 60_000),
    });
    setAuthUser(user);
    const res = await planRoute.GET();
    const body = (await res.json()) as { plan: string };
    expect(body.plan).toBe("free");
  });
});

describe("POST /api/plan (trial)", () => {
  it("mengaktifkan trial 7 hari sekali per akun", async () => {
    const user = await createUser();
    setAuthUser(user);

    const first = await planRoute.POST();
    expect(first.status).toBe(200);

    const upgraded = await db.user.findUniqueOrThrow({ where: { id: user.id } });
    expect(upgraded.plan).toBe("premium");
    expect(upgraded.trialUsedAt).toBeTruthy();
    const days = Math.round(
      ((upgraded.planExpiresAt?.getTime() ?? 0) - Date.now()) / (24 * 60 * 60 * 1000)
    );
    expect(days).toBe(7);

    // Simulasikan trial sudah berakhir: akun kembali Free tetapi trial tidak bisa dipakai lagi.
    await db.user.update({
      where: { id: user.id },
      data: { planExpiresAt: new Date(Date.now() - 60_000) },
    });
    const expired = await db.user.findUniqueOrThrow({ where: { id: user.id } });
    setAuthUser(expired);
    const second = await planRoute.POST();
    expect(second.status).toBe(403);
  });

  it("menolak trial untuk pengguna yang sudah Premium", async () => {
    const user = await createUser({ plan: "premium", planExpiresAt: null });
    setAuthUser(user);
    const res = await planRoute.POST();
    expect(res.status).toBe(400);
  });
});

describe("GET /api/ai-usage", () => {
  it("menolak tanpa sesi", async () => {
    const res = await aiUsageRoute.GET();
    expect(res.status).toBe(401);
  });

  it("melaporkan kuota sesuai paket", async () => {
    const user = await createUser({ plan: "premium", planExpiresAt: null });
    setAuthUser(user);
    const res = await aiUsageRoute.GET();
    const body = (await res.json()) as {
      plan: string;
      daily: { limit: number; remaining: number };
      minute: { limit: number };
    };
    expect(body.plan).toBe("premium");
    expect(body.daily.limit).toBe(300);
    expect(body.minute.limit).toBe(20);
    expect(body.daily.remaining).toBe(300);
  });
});

describe("GET /api/profile", () => {
  it("menolak tanpa sesi", async () => {
    const res = await profileRoute.GET();
    expect(res.status).toBe(401);
  });

  it("mengembalikan statistik pengguna yang login", async () => {
    const user = await createUser({ name: "Profil Test", xp: 120, level: 2, streakDays: 3 });
    setAuthUser(user);
    const res = await profileRoute.GET();
    const body = (await res.json()) as {
      profile: { nama: string; xp: number; totalQuiz: number; plan: string };
    };
    expect(res.status).toBe(200);
    expect(body.profile.nama).toBe("Profil Test");
    expect(body.profile.xp).toBe(120);
    expect(body.profile.totalQuiz).toBe(0);
    expect(body.profile.plan).toBe("free");
  });
});

describe("billing API", () => {
  it("menolak config tanpa sesi", async () => {
    const res = await billingConfigRoute.GET();
    expect(res.status).toBe(401);
  });

  it("hanya mengembalikan field config publik", async () => {
    const user = await createUser();
    setAuthUser(user);
    const res = await billingConfigRoute.GET();
    const body = (await res.json()) as Record<string, unknown>;
    expect(res.status).toBe(200);
    expect(Object.keys(body).sort()).toEqual(
      ["configured", "currency", "durationDays", "price", "provider"].sort()
    );
    expect(body.configured).toBe(false);
  });

  it("mengembalikan 503 saat gateway belum dikonfigurasi", async () => {
    const user = await createUser();
    setAuthUser(user);
    const res = await checkoutRoute.POST();
    const body = (await res.json()) as { code: string };
    expect(res.status).toBe(503);
    expect(body.code).toBe("billing_not_configured");
  });

  it("menolak checkout untuk admin", async () => {
    const admin = await createUser({ role: "admin" });
    setAuthUser(admin);
    const res = await checkoutRoute.POST();
    expect(res.status).toBe(400);
  });

  it("mengembalikan riwayat pembayaran kosong", async () => {
    const user = await createUser();
    setAuthUser(user);
    const res = await paymentsRoute.GET();
    const body = (await res.json()) as { payments: unknown[] };
    expect(res.status).toBe(200);
    expect(body.payments).toEqual([]);
  });

  it("menolak webhook Midtrans dengan signature salah", async () => {
    const res = await midtransWebhook.POST(
      jsonRequest("/api/billing/webhook/midtrans", "POST", {
        order_id: "SOBAT-TEST",
        status_code: "200",
        gross_amount: "19000.00",
        signature_key: "salah",
      })
    );
    expect(res.status).toBe(401);
  });
});
