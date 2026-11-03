import crypto from "node:crypto";
import { NextRequest } from "next/server";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { db } from "@/lib/db";
import { createUser, jsonRequest, resetDb, setAuthUser } from "./helpers";
import * as rootRoute from "@/app/api/route";
import * as registerRoute from "@/app/api/auth/register/route";
import * as checkoutRoute from "@/app/api/billing/checkout/route";
import * as midtransWebhook from "@/app/api/billing/webhook/midtrans/route";
import * as xenditWebhook from "@/app/api/billing/webhook/xendit/route";

const originalFetch = globalThis.fetch;
let ipCounter = 0;

function registerRequest(body: unknown) {
  ipCounter += 1;
  return new NextRequest("http://localhost:3000/api/auth/register", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "x-forwarded-for": `10.10.0.${ipCounter}`,
    },
    body: JSON.stringify(body),
  });
}

async function createPendingPayment(userId: string, orderId: string) {
  return db.payment.create({
    data: {
      userId,
      provider: "midtrans",
      orderId,
      amount: 19_000,
      durationDays: 30,
    },
  });
}

beforeEach(async () => {
  await resetDb();
  setAuthUser(null);
  delete process.env.MIDTRANS_SERVER_KEY;
  delete process.env.XENDIT_SECRET_KEY;
  delete process.env.XENDIT_CALLBACK_TOKEN;
  delete process.env.PAYMENT_PROVIDER;
});

afterEach(() => {
  globalThis.fetch = originalFetch;
  delete process.env.MIDTRANS_SERVER_KEY;
  delete process.env.XENDIT_SECRET_KEY;
  delete process.env.XENDIT_CALLBACK_TOKEN;
  delete process.env.PAYMENT_PROVIDER;
});

describe("GET /api", () => {
  it("mengembalikan health message", async () => {
    const res = await rootRoute.GET();
    const body = (await res.json()) as { message: string };
    expect(res.status).toBe(200);
    expect(body.message).toContain("Hello");
  });
});

describe("POST /api/auth/register", () => {
  it("menolak data tidak valid", async () => {
    const res = await registerRoute.POST(
      registerRequest({ name: "A", email: "bukan-email", password: "pendek" })
    );
    expect(res.status).toBe(400);
  });

  it("membuat akun baru dengan email huruf kecil dan password hash", async () => {
    const res = await registerRoute.POST(
      registerRequest({
        name: "Pendaftar Baru",
        email: "Pendaftar@Example.COM",
        password: "rahasia123",
      })
    );
    const body = (await res.json()) as { user: { id: string; email: string } };
    expect(res.status).toBe(200);
    expect(body.user.email).toBe("pendaftar@example.com");

    const user = await db.user.findUniqueOrThrow({ where: { id: body.user.id } });
    expect(user.passwordHash).toBeTruthy();
    expect(user.passwordHash).not.toBe("rahasia123");
    expect(user.plan).toBe("free");
  });

  it("menolak email yang sudah terdaftar", async () => {
    await createUser({ email: "sudah@example.com" });
    const res = await registerRoute.POST(
      registerRequest({ name: "Baru", email: "sudah@example.com", password: "rahasia123" })
    );
    expect(res.status).toBe(409);
  });

  it("membatasi 5 pendaftaran per jam per IP", async () => {
    ipCounter += 1;
    const ip = `10.20.0.${ipCounter}`;
    for (let i = 0; i < 5; i++) {
      const res = await registerRoute.POST(
        new NextRequest("http://localhost:3000/api/auth/register", {
          method: "POST",
          headers: { "Content-Type": "application/json", "x-forwarded-for": ip },
          body: JSON.stringify({
            name: `User ${i}`,
            email: `rate-${ip}-${i}@example.com`,
            password: "rahasia123",
          }),
        })
      );
      expect(res.status).toBe(200);
    }
    const blocked = await registerRoute.POST(
      new NextRequest("http://localhost:3000/api/auth/register", {
        method: "POST",
        headers: { "Content-Type": "application/json", "x-forwarded-for": ip },
        body: JSON.stringify({
          name: "User 6",
          email: `rate-${ip}-6@example.com`,
          password: "rahasia123",
        }),
      })
    );
    expect(blocked.status).toBe(429);
    expect(blocked.headers.get("Retry-After")).toBeTruthy();
  });
});

describe("checkout Midtrans", () => {
  it("membuat transaksi dan checkout URL lewat gateway", async () => {
    process.env.MIDTRANS_SERVER_KEY = "SB-Mid-server-test";
    const user = await createUser();
    setAuthUser(user);

    const fetchMock = vi.fn(async () => ({
      ok: true,
      status: 201,
      json: async () => ({ token: "snap-token", redirect_url: "https://pay.example/redirect" }),
    }));
    vi.stubGlobal("fetch", fetchMock);

    const res = await checkoutRoute.POST();
    const body = (await res.json()) as { checkoutUrl: string; orderId: string; provider: string };
    expect(res.status).toBe(200);
    expect(body.provider).toBe("midtrans");
    expect(body.checkoutUrl).toBe("https://pay.example/redirect");

    const payment = await db.payment.findUniqueOrThrow({ where: { orderId: body.orderId } });
    expect(payment.status).toBe("pending");
    expect(payment.checkoutUrl).toBe("https://pay.example/redirect");
    expect(fetchMock).toHaveBeenCalledTimes(1);

    const second = await checkoutRoute.POST();
    const secondBody = (await second.json()) as { reused?: boolean; orderId: string };
    expect(secondBody.orderId).toBe(body.orderId);
    expect(secondBody.reused).toBe(true);
    expect(fetchMock).toHaveBeenCalledTimes(1);
  });
});

describe("webhook Midtrans", () => {
  function signedPayload(orderId: string, grossAmount = "19000.00") {
    const statusCode = "200";
    const signature = crypto
      .createHash("sha512")
      .update(`${orderId}${statusCode}${grossAmount}SB-Mid-server-test`)
      .digest("hex");
    return {
      order_id: orderId,
      status_code: statusCode,
      gross_amount: grossAmount,
      signature_key: signature,
      transaction_status: "settlement",
      transaction_id: "trx-1",
    };
  }

  it("mengaktifkan Premium dan idempoten saat webhook diulang", async () => {
    process.env.MIDTRANS_SERVER_KEY = "SB-Mid-server-test";
    const user = await createUser();
    const payment = await createPendingPayment(user.id, "SOBAT-WEBHOOK-1");

    const first = await midtransWebhook.POST(
      jsonRequest("/api/billing/webhook/midtrans", "POST", signedPayload(payment.orderId))
    );
    expect(first.status).toBe(200);

    const upgraded = await db.user.findUniqueOrThrow({ where: { id: user.id } });
    expect(upgraded.plan).toBe("premium");
    expect(upgraded.planExpiresAt).toBeTruthy();
    const firstExpiry = upgraded.planExpiresAt!.getTime();
    expect(await db.payment.findUniqueOrThrow({ where: { id: payment.id } })).toMatchObject({
      status: "paid",
    });

    const second = await midtransWebhook.POST(
      jsonRequest("/api/billing/webhook/midtrans", "POST", signedPayload(payment.orderId))
    );
    expect(second.status).toBe(200);
    const afterReplay = await db.user.findUniqueOrThrow({ where: { id: user.id } });
    expect(afterReplay.planExpiresAt!.getTime()).toBe(firstExpiry);
    expect(await db.notification.count({ where: { userId: user.id, type: "plan_updated" } })).toBe(1);
  });

  it("menolak nominal yang tidak cocok", async () => {
    process.env.MIDTRANS_SERVER_KEY = "SB-Mid-server-test";
    const user = await createUser();
    const payment = await createPendingPayment(user.id, "SOBAT-WEBHOOK-2");

    const res = await midtransWebhook.POST(
      jsonRequest(
        "/api/billing/webhook/midtrans",
        "POST",
        signedPayload(payment.orderId, "1000.00")
      )
    );
    expect(res.status).toBe(400);
    expect((await db.payment.findUniqueOrThrow({ where: { id: payment.id } })).status).toBe("pending");
  });
});

describe("webhook Xendit", () => {
  it("mengaktifkan Premium dengan callback token yang benar", async () => {
    process.env.XENDIT_CALLBACK_TOKEN = "callback-token-test";
    const user = await createUser();
    const payment = await db.payment.create({
      data: {
        userId: user.id,
        provider: "xendit",
        orderId: "SOBAT-XENDIT-1",
        amount: 19_000,
        durationDays: 30,
      },
    });

    const req = new NextRequest("http://localhost:3000/api/billing/webhook/xendit", {
      method: "POST",
      headers: { "Content-Type": "application/json", "x-callback-token": "callback-token-test" },
      body: JSON.stringify({
        external_id: payment.orderId,
        id: "inv-1",
        status: "PAID",
        paid_amount: 19_000,
      }),
    });
    const res = await xenditWebhook.POST(req);
    expect(res.status).toBe(200);

    const updated = await db.user.findUniqueOrThrow({ where: { id: user.id } });
    expect(updated.plan).toBe("premium");
    expect((await db.payment.findUniqueOrThrow({ where: { id: payment.id } })).status).toBe("paid");
  });

  it("menolak callback token yang salah", async () => {
    process.env.XENDIT_CALLBACK_TOKEN = "callback-token-test";
    const req = new NextRequest("http://localhost:3000/api/billing/webhook/xendit", {
      method: "POST",
      headers: { "Content-Type": "application/json", "x-callback-token": "salah" },
      body: JSON.stringify({ external_id: "x", status: "PAID" }),
    });
    expect((await xenditWebhook.POST(req)).status).toBe(401);
  });
});
