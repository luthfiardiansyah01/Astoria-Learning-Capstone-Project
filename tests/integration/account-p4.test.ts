import { beforeEach, describe, expect, it } from "vitest";
import bcrypt from "bcryptjs";
import { db } from "@/lib/db";
import { createUser, jsonRequest, params, resetDb, setAuthUser } from "./helpers";
import * as profileRoute from "@/app/api/profile/route";
import * as passwordRoute from "@/app/api/profile/password/route";
import * as exportRoute from "@/app/api/profile/export/route";
import * as resetRoute from "@/app/api/auth/reset-password/route";
import * as forgotRoute from "@/app/api/auth/forgot-password/route";
import * as adminPaymentRoute from "@/app/api/admin/payments/[paymentId]/route";
import { createPasswordResetToken } from "@/lib/password-reset";

async function userWithPassword(password = "password-lama") {
  return createUser({ passwordHash: await bcrypt.hash(password, 12) });
}

beforeEach(async () => {
  await resetDb();
  setAuthUser(null);
});

describe("lupa & reset password", () => {
  it("memberi respons generik untuk email yang tidak terdaftar", async () => {
    const res = await forgotRoute.POST(
      jsonRequest("/api/auth/forgot-password", "POST", { email: "tidak-ada@example.com" })
    );
    expect(res.status).toBe(200);
    const body = (await res.json()) as { ok: boolean; message: string };
    expect(body.ok).toBe(true);
  });

  it("menukar token reset dengan password baru sekali pakai", async () => {
    const user = await userWithPassword("password-lama");
    const { token } = await createPasswordResetToken(user.id);

    const res = await resetRoute.POST(
      jsonRequest("/api/auth/reset-password", "POST", {
        token,
        password: "password-baru",
      })
    );
    expect(res.status).toBe(200);

    const updated = await db.user.findUniqueOrThrow({ where: { id: user.id } });
    expect(await bcrypt.compare("password-baru", updated.passwordHash!)).toBe(true);

    const again = await resetRoute.POST(
      jsonRequest("/api/auth/reset-password", "POST", {
        token,
        password: "password-lain",
      })
    );
    expect(again.status).toBe(400);
  });

  it("menolak token yang tidak dikenal", async () => {
    const res = await resetRoute.POST(
      jsonRequest("/api/auth/reset-password", "POST", {
        token: "token-palsu-yang-panjang",
        password: "password-baru",
      })
    );
    expect(res.status).toBe(400);
  });
});

describe("ganti password", () => {
  it("menolak password lama yang salah dan menerima yang benar", async () => {
    const user = await userWithPassword("password-lama");
    setAuthUser(user);

    const wrong = await passwordRoute.POST(
      jsonRequest("/api/profile/password", "POST", {
        currentPassword: "salah",
        newPassword: "password-baru",
      })
    );
    expect(wrong.status).toBe(400);

    const ok = await passwordRoute.POST(
      jsonRequest("/api/profile/password", "POST", {
        currentPassword: "password-lama",
        newPassword: "password-baru",
      })
    );
    expect(ok.status).toBe(200);

    const updated = await db.user.findUniqueOrThrow({ where: { id: user.id } });
    expect(await bcrypt.compare("password-baru", updated.passwordHash!)).toBe(true);
  });
});

describe("ekspor & hapus akun", () => {
  it("mengekspor data akun sebagai JSON", async () => {
    const user = await userWithPassword();
    setAuthUser(user);

    const res = await exportRoute.GET();
    expect(res.status).toBe(200);
    expect(res.headers.get("content-disposition")).toContain("attachment");
    const body = (await res.json()) as { account: { email: string | null } };
    expect(body.account.email).toBe(user.email);
  });

  it("menghapus akun tanpa riwayat pembayaran", async () => {
    const user = await userWithPassword("hapus-akun");
    setAuthUser(user);

    const res = await profileRoute.DELETE(
      jsonRequest("/api/profile", "DELETE", { password: "hapus-akun" })
    );
    expect(res.status).toBe(200);
    expect(await db.user.findUnique({ where: { id: user.id } })).toBeNull();
  });

  it("menolak hapus akun yang memiliki riwayat pembayaran", async () => {
    const user = await userWithPassword("hapus-akun");
    await db.payment.create({
      data: {
        userId: user.id,
        provider: "manual",
        orderId: `SOBAT-DEL-${Date.now()}`,
        amount: 19_000,
        durationDays: 30,
        status: "paid",
      },
    });
    setAuthUser(user);

    const res = await profileRoute.DELETE(
      jsonRequest("/api/profile", "DELETE", { password: "hapus-akun" })
    );
    expect(res.status).toBe(409);
    const body = (await res.json()) as { code?: string };
    expect(body.code).toBe("has_payments");
    expect(await db.user.findUnique({ where: { id: user.id } })).not.toBeNull();
  });

  it("menolak penghapusan akun admin", async () => {
    const admin = await createUser({
      role: "admin",
      passwordHash: await bcrypt.hash("admin-pass", 12),
    });
    setAuthUser(admin);

    const res = await profileRoute.DELETE(
      jsonRequest("/api/profile", "DELETE", { password: "admin-pass" })
    );
    expect(res.status).toBe(400);
  });
});

describe("refund admin", () => {
  it("mewajibkan alasan dan menyimpannya untuk audit", async () => {
    const admin = await createUser({ role: "admin" });
    const user = await createUser();
    const payment = await db.payment.create({
      data: {
        userId: user.id,
        provider: "manual",
        orderId: `SOBAT-REF-${Date.now()}`,
        amount: 19_000,
        durationDays: 30,
        status: "paid",
        paidAt: new Date(),
      },
    });
    setAuthUser(admin);

    const withoutReason = await adminPaymentRoute.PATCH(
      jsonRequest(`/api/admin/payments/${payment.id}`, "PATCH", { status: "refunded" }),
      params({ paymentId: payment.id })
    );
    expect(withoutReason.status).toBe(400);

    const withReason = await adminPaymentRoute.PATCH(
      jsonRequest(`/api/admin/payments/${payment.id}`, "PATCH", {
        status: "refunded",
        reason: "Salah nominal transfer",
      }),
      params({ paymentId: payment.id })
    );
    expect(withReason.status).toBe(200);

    const updated = await db.payment.findUniqueOrThrow({ where: { id: payment.id } });
    expect(updated.status).toBe("refunded");
    expect(JSON.stringify(updated.rawPayload)).toContain("Salah nominal transfer");
  });
});
