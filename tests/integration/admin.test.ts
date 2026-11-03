import { beforeEach, describe, expect, it, vi } from "vitest";
import { db } from "@/lib/db";
import { chatComplete } from "@/lib/ai";
import {
  createDocument,
  createUser,
  jsonRequest,
  params,
  resetDb,
  setAuthUser,
} from "./helpers";
import * as decisionRoute from "@/app/api/admin/decision/route";
import * as analyticsRoute from "@/app/api/admin/analytics/route";
import * as adminUsersRoute from "@/app/api/admin/users/route";
import * as adminPlanRoute from "@/app/api/admin/users/[userId]/plan/route";
import * as adminPaymentsRoute from "@/app/api/admin/payments/route";
import * as adminPaymentRoute from "@/app/api/admin/payments/[paymentId]/route";

beforeEach(async () => {
  await resetDb();
  setAuthUser(null);
  vi.mocked(chatComplete).mockReset();
  vi.mocked(chatComplete).mockResolvedValue("1. Ringkasan mock\n2. Rekomendasi mock");
});

describe("POST /api/admin/decision", () => {
  it("menolak tanpa sesi", async () => {
    const res = await decisionRoute.POST(
      jsonRequest("/api/admin/decision", "POST", { documentId: "x", decision: "approved" })
    );
    expect(res.status).toBe(401);
  });

  it("menolak pengguna biasa", async () => {
    const user = await createUser();
    setAuthUser(user);
    const res = await decisionRoute.POST(
      jsonRequest("/api/admin/decision", "POST", { documentId: "x", decision: "approved" })
    );
    expect(res.status).toBe(403);
  });

  it("menolak keputusan yang tidak valid", async () => {
    const admin = await createUser({ role: "admin" });
    setAuthUser(admin);
    const res = await decisionRoute.POST(
      jsonRequest("/api/admin/decision", "POST", { documentId: "x", decision: "publish" })
    );
    expect(res.status).toBe(400);
  });

  it("mengubah status dokumen", async () => {
    const admin = await createUser({ role: "admin" });
    const owner = await createUser();
    const doc = await createDocument(owner.id, { status: "pending" });
    setAuthUser(admin);

    const res = await decisionRoute.POST(
      jsonRequest("/api/admin/decision", "POST", { documentId: doc.id, decision: "approved" })
    );
    const body = (await res.json()) as { document: { status: string } };
    expect(res.status).toBe(200);
    expect(body.document.status).toBe("approved");
    expect((await db.document.findUniqueOrThrow({ where: { id: doc.id } })).status).toBe("approved");
  });
});

describe("GET /api/admin/analytics", () => {
  it("menolak non-admin", async () => {
    const user = await createUser();
    setAuthUser(user);
    const res = await analyticsRoute.GET(jsonRequest("/api/admin/analytics", "GET"));
    expect(res.status).toBe(403);
  });

  it("mengembalikan statistik tanpa memanggil AI secara default", async () => {
    const admin = await createUser({ role: "admin" });
    const owner = await createUser();
    await createDocument(owner.id, { status: "approved" });
    setAuthUser(admin);

    const res = await analyticsRoute.GET(jsonRequest("/api/admin/analytics", "GET"));
    const body = (await res.json()) as {
      analytics: { totalDocuments: number; insight: string | null; statusBreakdown: { approved: number } };
    };
    expect(res.status).toBe(200);
    expect(body.analytics.totalDocuments).toBe(1);
    expect(body.analytics.statusBreakdown.approved).toBe(1);
    expect(body.analytics.insight).toBeNull();
    expect(chatComplete).not.toHaveBeenCalled();
  });

  it("membuat insight AI hanya saat diminta", async () => {
    const admin = await createUser({ role: "admin" });
    setAuthUser(admin);

    const res = await analyticsRoute.GET(
      jsonRequest("/api/admin/analytics?insight=1", "GET")
    );
    const body = (await res.json()) as { analytics: { insight: string | null } };
    expect(res.status).toBe(200);
    expect(body.analytics.insight).toContain("mock");
    expect(chatComplete).toHaveBeenCalledTimes(1);
  });
});

describe("GET /api/admin/users", () => {
  it("menolak non-admin", async () => {
    const user = await createUser();
    setAuthUser(user);
    const res = await adminUsersRoute.GET(jsonRequest("/api/admin/users", "GET"));
    expect(res.status).toBe(403);
  });

  it("mencari pengguna dan menghitung statistik paket", async () => {
    const admin = await createUser({ role: "admin" });
    await createUser({ name: "Budi Santoso", email: "budi@example.com" });
    await createUser({
      name: "Siti Premium",
      email: "siti@example.com",
      plan: "premium",
      planExpiresAt: null,
    });
    setAuthUser(admin);

    const res = await adminUsersRoute.GET(
      jsonRequest("/api/admin/users?q=Budi", "GET")
    );
    const body = (await res.json()) as {
      users: { name: string; effectivePlan: string }[];
      total: number;
      stats: { total: number; free: number; premium: number };
    };
    expect(res.status).toBe(200);
    expect(body.total).toBe(1);
    expect(body.users[0].name).toBe("Budi Santoso");
    expect(body.users[0].effectivePlan).toBe("free");
    expect(body.stats.total).toBe(3);
    expect(body.stats.premium).toBe(2);
    expect(body.stats.free).toBe(1);
  });

  it("memfilter paket premium dan free", async () => {
    const admin = await createUser({ role: "admin" });
    await createUser({ name: "Free User" });
    await createUser({ name: "Premium User", plan: "premium", planExpiresAt: null });
    setAuthUser(admin);

    const premium = (await (
      await adminUsersRoute.GET(jsonRequest("/api/admin/users?plan=premium", "GET"))
    ).json()) as { users: { name: string }[]; total: number };
    expect(premium.users.some((u) => u.name === "Premium User")).toBe(true);
    expect(premium.users.some((u) => u.name === "Free User")).toBe(false);

    const free = (await (
      await adminUsersRoute.GET(jsonRequest("/api/admin/users?plan=free", "GET"))
    ).json()) as { users: { name: string }[]; total: number };
    expect(free.users.some((u) => u.name === "Free User")).toBe(true);
    expect(free.users.some((u) => u.name === "Admin")).toBe(false);
  });
});

describe("PATCH /api/admin/users/[userId]/plan", () => {
  it("menolak non-admin", async () => {
    const user = await createUser();
    const target = await createUser();
    setAuthUser(user);
    const res = await adminPlanRoute.PATCH(
      jsonRequest(`/api/admin/users/${target.id}/plan`, "PATCH", { plan: "premium", days: 30 }),
      params({ userId: target.id })
    );
    expect(res.status).toBe(403);
  });

  it("menolak perubahan untuk akun admin", async () => {
    const admin = await createUser({ role: "admin" });
    const otherAdmin = await createUser({ role: "admin" });
    setAuthUser(admin);
    const res = await adminPlanRoute.PATCH(
      jsonRequest(`/api/admin/users/${otherAdmin.id}/plan`, "PATCH", { plan: "free" }),
      params({ userId: otherAdmin.id })
    );
    expect(res.status).toBe(400);
  });

  it("memperpanjang dari sisa masa aktif", async () => {
    const admin = await createUser({ role: "admin" });
    const target = await createUser({
      plan: "premium",
      planExpiresAt: new Date(Date.now() + 10 * 24 * 60 * 60 * 1000),
    });
    setAuthUser(admin);

    const res = await adminPlanRoute.PATCH(
      jsonRequest(`/api/admin/users/${target.id}/plan`, "PATCH", { plan: "premium", days: 30 }),
      params({ userId: target.id })
    );
    expect(res.status).toBe(200);
    const updated = await db.user.findUniqueOrThrow({ where: { id: target.id } });
    const days = Math.round(
      ((updated.planExpiresAt?.getTime() ?? 0) - Date.now()) / (24 * 60 * 60 * 1000)
    );
    expect(days).toBe(40);
  });

  it("menurunkan ke Free dan mereset trial", async () => {
    const admin = await createUser({ role: "admin" });
    const target = await createUser({
      plan: "premium",
      planExpiresAt: new Date(Date.now() + 10 * 24 * 60 * 60 * 1000),
      trialUsedAt: new Date(),
    });
    setAuthUser(admin);

    const res = await adminPlanRoute.PATCH(
      jsonRequest(`/api/admin/users/${target.id}/plan`, "PATCH", {
        plan: "free",
        resetTrial: true,
      }),
      params({ userId: target.id })
    );
    expect(res.status).toBe(200);
    const updated = await db.user.findUniqueOrThrow({ where: { id: target.id } });
    expect(updated.plan).toBe("free");
    expect(updated.planExpiresAt).toBeNull();
    expect(updated.trialUsedAt).toBeNull();
  });
});

describe("admin payments", () => {
  it("menolak non-admin", async () => {
    const user = await createUser();
    setAuthUser(user);
    expect((await adminPaymentsRoute.GET()).status).toBe(403);
  });

  it("mengembalikan transaksi dan konfigurasi gateway", async () => {
    const admin = await createUser({ role: "admin" });
    const student = await createUser();
    await db.payment.create({
      data: {
        userId: student.id,
        provider: "manual",
        orderId: "SOBAT-ADMIN-1",
        amount: 19_000,
      },
    });
    setAuthUser(admin);

    const res = await adminPaymentsRoute.GET();
    const body = (await res.json()) as {
      payments: { orderId: string }[];
      stats: { pending: number };
      config: { provider: string; configured: boolean };
    };
    expect(res.status).toBe(200);
    expect(body.payments[0].orderId).toBe("SOBAT-ADMIN-1");
    expect(body.stats.pending).toBe(1);
    expect(body.config.configured).toBe(false);
  });

  it("mengonfirmasi pembayaran manual dan mengaktifkan Premium", async () => {
    const admin = await createUser({ role: "admin" });
    const student = await createUser();
    const payment = await db.payment.create({
      data: {
        userId: student.id,
        provider: "manual",
        orderId: "SOBAT-MANUAL-1",
        amount: 19_000,
        durationDays: 30,
      },
    });
    setAuthUser(admin);

    const res = await adminPaymentRoute.PATCH(
      jsonRequest(`/api/admin/payments/${payment.id}`, "PATCH", { status: "paid" }),
      params({ paymentId: payment.id })
    );
    const body = (await res.json()) as { payment: { status: string } };
    expect(res.status).toBe(200);
    expect(body.payment.status).toBe("paid");

    const updated = await db.user.findUniqueOrThrow({ where: { id: student.id } });
    expect(updated.plan).toBe("premium");
    expect(updated.planExpiresAt).toBeTruthy();
    expect(await db.notification.count({ where: { userId: student.id, type: "plan_updated" } })).toBe(1);
  });
});
