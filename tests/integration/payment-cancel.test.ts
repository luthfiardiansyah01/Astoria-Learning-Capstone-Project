import { beforeEach, describe, expect, it } from "vitest";
import { db } from "@/lib/db";
import { updatePaymentStatus } from "@/lib/billing";
import { createUser, jsonRequest, params, resetDb, setAuthUser } from "./helpers";
import * as cancelRoute from "@/app/api/billing/payments/[paymentId]/route";
import * as adminPaymentRoute from "@/app/api/admin/payments/[paymentId]/route";

async function createPayment(
  userId: string,
  overrides: { status?: string; orderId?: string; provider?: string } = {}
) {
  return db.payment.create({
    data: {
      userId,
      provider: overrides.provider ?? "manual",
      orderId: overrides.orderId ?? `SOBAT-CANCEL-${Date.now()}`,
      amount: 19_000,
      durationDays: 30,
      status: overrides.status ?? "pending",
    },
  });
}

beforeEach(async () => {
  await resetDb();
  setAuthUser(null);
});

describe("DELETE /api/billing/payments/[paymentId]", () => {
  it("membatalkan pesanan pending milik sendiri", async () => {
    const user = await createUser();
    const payment = await createPayment(user.id);
    setAuthUser(user);

    const res = await cancelRoute.DELETE(
      jsonRequest(`/api/billing/payments/${payment.id}`, "DELETE"),
      params({ paymentId: payment.id })
    );
    const body = (await res.json()) as { payment: { status: string } };
    expect(res.status).toBe(200);
    expect(body.payment.status).toBe("cancelled");
    expect((await db.payment.findUniqueOrThrow({ where: { id: payment.id } })).status).toBe(
      "cancelled"
    );
  });

  it("menolak pembatalan pesanan pengguna lain", async () => {
    const owner = await createUser();
    const other = await createUser();
    const payment = await createPayment(owner.id);
    setAuthUser(other);

    const res = await cancelRoute.DELETE(
      jsonRequest(`/api/billing/payments/${payment.id}`, "DELETE"),
      params({ paymentId: payment.id })
    );
    expect(res.status).toBe(404);
    expect((await db.payment.findUniqueOrThrow({ where: { id: payment.id } })).status).toBe(
      "pending"
    );
  });

  it("menolak pembatalan pesanan yang sudah dibayar", async () => {
    const user = await createUser();
    const payment = await createPayment(user.id, { status: "paid" });
    setAuthUser(user);

    const res = await cancelRoute.DELETE(
      jsonRequest(`/api/billing/payments/${payment.id}`, "DELETE"),
      params({ paymentId: payment.id })
    );
    expect(res.status).toBe(409);
  });

  it("idempoten untuk pesanan yang sudah dibatalkan", async () => {
    const user = await createUser();
    const payment = await createPayment(user.id, { status: "cancelled" });
    setAuthUser(user);

    const res = await cancelRoute.DELETE(
      jsonRequest(`/api/billing/payments/${payment.id}`, "DELETE"),
      params({ paymentId: payment.id })
    );
    expect(res.status).toBe(200);
  });

  it("tidak membuka kembali pesanan cancelled karena webhook terlambat", async () => {
    const user = await createUser();
    const payment = await createPayment(user.id, { status: "cancelled" });

    await updatePaymentStatus({ orderId: payment.orderId, status: "pending" });

    const after = await db.payment.findUniqueOrThrow({ where: { id: payment.id } });
    expect(after.status).toBe("cancelled");
  });

  it("mencatat refund untuk pesanan yang sudah lunas", async () => {
    const user = await createUser();
    const payment = await createPayment(user.id, { status: "paid" });

    const result = await updatePaymentStatus({ orderId: payment.orderId, status: "refunded" });
    expect("count" in result ? result.count : 0).toBe(1);

    const after = await db.payment.findUniqueOrThrow({ where: { id: payment.id } });
    expect(after.status).toBe("refunded");
  });

  it("tidak membuka refunded kembali menjadi pending", async () => {
    const user = await createUser();
    const payment = await createPayment(user.id, { status: "refunded" });

    await updatePaymentStatus({ orderId: payment.orderId, status: "pending" });

    const after = await db.payment.findUniqueOrThrow({ where: { id: payment.id } });
    expect(after.status).toBe("refunded");
  });

  it("tidak menandai refund untuk pesanan yang belum lunas", async () => {
    const user = await createUser();
    const payment = await createPayment(user.id, { status: "pending" });

    const result = await updatePaymentStatus({ orderId: payment.orderId, status: "refunded" });
    expect("count" in result ? result.count : 0).toBe(0);
    expect((await db.payment.findUniqueOrThrow({ where: { id: payment.id } })).status).toBe(
      "pending"
    );
  });
});

describe("admin membatalkan pesanan", () => {
  it("menolak membatalkan pesanan yang sudah lunas", async () => {
    const admin = await createUser({ role: "admin" });
    const user = await createUser();
    const payment = await createPayment(user.id, { status: "paid" });
    setAuthUser(admin);

    const res = await adminPaymentRoute.PATCH(
      jsonRequest(`/api/admin/payments/${payment.id}`, "PATCH", { status: "cancelled" }),
      params({ paymentId: payment.id })
    );
    expect(res.status).toBe(400);
    expect((await db.payment.findUniqueOrThrow({ where: { id: payment.id } })).status).toBe("paid");
  });

  it("mencatat refund untuk pesanan lunas", async () => {
    const admin = await createUser({ role: "admin" });
    const user = await createUser();
    const payment = await createPayment(user.id, { status: "paid" });
    setAuthUser(admin);

    const res = await adminPaymentRoute.PATCH(
      jsonRequest(`/api/admin/payments/${payment.id}`, "PATCH", { status: "refunded" }),
      params({ paymentId: payment.id })
    );
    const body = (await res.json()) as { payment: { status: string } };
    expect(res.status).toBe(200);
    expect(body.payment.status).toBe("refunded");
  });

  it("mengubah status menjadi cancelled", async () => {
    const admin = await createUser({ role: "admin" });
    const user = await createUser();
    const payment = await createPayment(user.id);
    setAuthUser(admin);

    const res = await adminPaymentRoute.PATCH(
      jsonRequest(`/api/admin/payments/${payment.id}`, "PATCH", { status: "cancelled" }),
      params({ paymentId: payment.id })
    );
    const body = (await res.json()) as { payment: { status: string } };
    expect(res.status).toBe(200);
    expect(body.payment.status).toBe("cancelled");
  });
});
