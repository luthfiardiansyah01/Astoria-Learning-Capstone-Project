import crypto from "node:crypto";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import {
  appUrl,
  billingConfig,
  billingProvider,
  cancelProviderPayment,
  midtransStatus,
  newOrderId,
  premiumExpiryFrom,
  verifyMidtransSignature,
  verifyXenditCallback,
  xenditStatus,
} from "@/lib/billing";

const ENV_KEYS = [
  "PAYMENT_PROVIDER",
  "MIDTRANS_SERVER_KEY",
  "MIDTRANS_CLIENT_KEY",
  "MIDTRANS_IS_PRODUCTION",
  "XENDIT_SECRET_KEY",
  "XENDIT_CALLBACK_TOKEN",
  "NEXT_PUBLIC_APP_URL",
  "NEXTAUTH_URL",
] as const;

const original: Record<string, string | undefined> = {};

beforeEach(() => {
  for (const key of ENV_KEYS) {
    original[key] = process.env[key];
    delete process.env[key];
  }
  process.env.NEXTAUTH_URL = "http://localhost:3000";
});

afterEach(() => {
  for (const key of ENV_KEYS) {
    if (original[key] === undefined) delete process.env[key];
    else process.env[key] = original[key];
  }
  vi.unstubAllGlobals();
  vi.useRealTimers();
});

describe("billingProvider", () => {
  it("none bila tidak ada kredensial", () => {
    expect(billingProvider()).toBe("none");
  });

  it("mendeteksi Midtrans dari server key", () => {
    process.env.MIDTRANS_SERVER_KEY = "SB-Mid-server-test";
    expect(billingProvider()).toBe("midtrans");
  });

  it("mendeteksi Xendit dari secret key", () => {
    process.env.XENDIT_SECRET_KEY = "xnd_development_test";
    expect(billingProvider()).toBe("xendit");
  });

  it("menghormati PAYMENT_PROVIDER eksplisit", () => {
    process.env.MIDTRANS_SERVER_KEY = "mid";
    process.env.XENDIT_SECRET_KEY = "xnd";
    process.env.PAYMENT_PROVIDER = "xendit";
    expect(billingProvider()).toBe("xendit");
  });

  it("mengabaikan provider eksplisit yang kredensialnya kosong", () => {
    process.env.PAYMENT_PROVIDER = "midtrans";
    process.env.XENDIT_SECRET_KEY = "xnd";
    expect(billingProvider()).toBe("xendit");
  });
});

describe("billingConfig", () => {
  it("menampilkan harga dan durasi default", () => {
    const config = billingConfig();
    expect(config.configured).toBe(false);
    expect(config.price).toBe(19_000);
    expect(config.durationDays).toBe(30);
    expect(config.currency).toBe("IDR");
  });

  it("menyertakan checklist kedua provider saat belum dikonfigurasi", () => {
    const config = billingConfig();
    const keys = config.requiredEnv.map((e) => e.key);
    expect(keys).toContain("MIDTRANS_SERVER_KEY");
    expect(keys).toContain("XENDIT_SECRET_KEY");
    expect(config.requiredEnv.every((e) => e.set === false)).toBe(true);
  });

  it("menandai provider terkonfigurasi beserta webhook-nya", () => {
    process.env.MIDTRANS_SERVER_KEY = "mid";
    const config = billingConfig();
    expect(config.provider).toBe("midtrans");
    expect(config.configured).toBe(true);
    expect(config.webhookUrls.midtrans).toBe("http://localhost:3000/api/billing/webhook/midtrans");
    expect(config.webhookUrls.xendit).toContain("/api/billing/webhook/xendit");
  });

  it("hanya menampilkan checklist Xendit saat provider Xendit", () => {
    process.env.XENDIT_SECRET_KEY = "xnd";
    process.env.XENDIT_CALLBACK_TOKEN = "token";
    const config = billingConfig();
    expect(config.provider).toBe("xendit");
    expect(config.requiredEnv.map((e) => e.key)).toEqual([
      "XENDIT_SECRET_KEY",
      "XENDIT_CALLBACK_TOKEN",
    ]);
    expect(config.requiredEnv.every((e) => e.set)).toBe(true);
  });

  it("memakai NEXT_PUBLIC_APP_URL untuk webhook", () => {
    process.env.MIDTRANS_SERVER_KEY = "mid";
    process.env.NEXT_PUBLIC_APP_URL = "https://sobat.example.com";
    expect(billingConfig().webhookUrls.midtrans).toBe(
      "https://sobat.example.com/api/billing/webhook/midtrans"
    );
  });
});

describe("appUrl", () => {
  it("memakai NEXT_PUBLIC_APP_URL dan menghapus garis miring akhir", () => {
    process.env.NEXT_PUBLIC_APP_URL = "https://sobat.example.com/";
    expect(appUrl()).toBe("https://sobat.example.com");
  });

  it("memakai NEXTAUTH_URL sebagai fallback", () => {
    process.env.NEXTAUTH_URL = "https://app.example.com";
    expect(appUrl()).toBe("https://app.example.com");
  });
});

describe("premiumExpiryFrom", () => {
  beforeEach(() => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date("2026-06-01T12:00:00Z"));
  });

  it("memulai dari sekarang bila belum punya langganan", () => {
    expect(premiumExpiryFrom(null, 30).toISOString()).toBe("2026-07-01T12:00:00.000Z");
  });

  it("memperpanjang dari sisa langganan yang masih aktif", () => {
    const base = new Date("2026-06-11T12:00:00Z");
    expect(premiumExpiryFrom(base, 30).toISOString()).toBe("2026-07-11T12:00:00.000Z");
  });

  it("mengabaikan tanggal yang sudah lewat", () => {
    const base = new Date("2026-05-01T12:00:00Z");
    expect(premiumExpiryFrom(base, 7).toISOString()).toBe("2026-06-08T12:00:00.000Z");
  });
});

describe("pemetaan status gateway", () => {
  it("memetakan status Midtrans", () => {
    expect(midtransStatus({ transaction_status: "settlement" })).toBe("paid");
    expect(midtransStatus({ transaction_status: "capture", fraud_status: "accept" })).toBe("paid");
    expect(midtransStatus({ transaction_status: "capture", fraud_status: "challenge" })).toBe("pending");
    expect(midtransStatus({ transaction_status: "capture", fraud_status: "deny" })).toBe("failed");
    expect(midtransStatus({ transaction_status: "authorize" })).toBe("pending");
    expect(midtransStatus({ transaction_status: "pending" })).toBe("pending");
    expect(midtransStatus({ transaction_status: "expire" })).toBe("expired");
    expect(midtransStatus({ transaction_status: "deny" })).toBe("failed");
    expect(midtransStatus({ transaction_status: "cancel" })).toBe("failed");
    expect(midtransStatus({ transaction_status: "failure" })).toBe("failed");
    expect(midtransStatus({ transaction_status: "refund" })).toBe("refunded");
    expect(midtransStatus({ transaction_status: "tidak-dikenal" })).toBe("pending");
  });

  it("memetakan status Xendit", () => {
    expect(xenditStatus("PAID")).toBe("paid");
    expect(xenditStatus("SETTLED")).toBe("paid");
    expect(xenditStatus("EXPIRED")).toBe("expired");
    expect(xenditStatus("FAILED")).toBe("failed");
    expect(xenditStatus("REFUNDED")).toBe("refunded");
    expect(xenditStatus(undefined)).toBe("pending");
  });
});

describe("verifikasi webhook", () => {
  it("menerima signature Midtrans yang benar", () => {
    process.env.MIDTRANS_SERVER_KEY = "test-server-key";
    const payload = {
      order_id: "SOBAT-1",
      status_code: "200",
      gross_amount: "19000.00",
      signature_key: "",
    };
    payload.signature_key = crypto
      .createHash("sha512")
      .update(`${payload.order_id}${payload.status_code}${payload.gross_amount}test-server-key`)
      .digest("hex");

    expect(verifyMidtransSignature(payload)).toBe(true);
  });

  it("menolak signature Midtrans yang salah atau tidak lengkap", () => {
    process.env.MIDTRANS_SERVER_KEY = "test-server-key";
    expect(
      verifyMidtransSignature({
        order_id: "SOBAT-1",
        status_code: "200",
        gross_amount: "19000.00",
        signature_key: "deadbeef",
      })
    ).toBe(false);
    expect(verifyMidtransSignature({ order_id: "SOBAT-1" })).toBe(false);
  });

  it("menolak signature bila server key belum diisi", () => {
    expect(
      verifyMidtransSignature({
        order_id: "SOBAT-1",
        status_code: "200",
        gross_amount: "19000.00",
        signature_key: "x",
      })
    ).toBe(false);
  });

  it("memverifikasi callback token Xendit", () => {
    process.env.XENDIT_CALLBACK_TOKEN = "token-rahasia";
    expect(verifyXenditCallback("token-rahasia")).toBe(true);
    expect(verifyXenditCallback("token-salah")).toBe(false);
    expect(verifyXenditCallback(null)).toBe(false);
  });
});

describe("cancelProviderPayment", () => {
  it("membatalkan transaksi Midtrans", async () => {
    process.env.MIDTRANS_SERVER_KEY = "Mid-server-test";
    process.env.MIDTRANS_IS_PRODUCTION = "true";
    const fetchMock = vi.fn(async () => ({ ok: true, status: 200, text: async () => "" }));
    vi.stubGlobal("fetch", fetchMock);

    const result = await cancelProviderPayment({
      provider: "midtrans",
      orderId: "SOBAT-CANCEL-1",
    });

    expect(result).toEqual({ cancelled: true });
    expect(fetchMock).toHaveBeenCalledWith(
      "https://api.midtrans.com/v2/SOBAT-CANCEL-1/cancel",
      expect.objectContaining({ method: "POST" })
    );
  });

  it("melaporkan kegagalan pembatalan Midtrans", async () => {
    process.env.MIDTRANS_SERVER_KEY = "SB-Mid-server-test";
    const fetchMock = vi.fn(async () => ({
      ok: false,
      status: 412,
      text: async () => "Transaction cannot be canceled",
    }));
    vi.stubGlobal("fetch", fetchMock);

    const result = await cancelProviderPayment({
      provider: "midtrans",
      orderId: "SOBAT-CANCEL-2",
    });

    expect(result.cancelled).toBe(false);
    expect(result.warning).toContain("412");
    expect(fetchMock).toHaveBeenCalledWith(
      "https://api.sandbox.midtrans.com/v2/SOBAT-CANCEL-2/cancel",
      expect.objectContaining({ method: "POST" })
    );
  });

  it("membatalkan invoice Xendit", async () => {
    process.env.XENDIT_SECRET_KEY = "xnd_development_test";
    const fetchMock = vi.fn(async () => ({ ok: true, status: 200, text: async () => "" }));
    vi.stubGlobal("fetch", fetchMock);

    const result = await cancelProviderPayment({
      provider: "xendit",
      orderId: "SOBAT-CANCEL-3",
      providerRef: "inv-123",
    });

    expect(result).toEqual({ cancelled: true });
    expect(fetchMock).toHaveBeenCalledWith(
      "https://api.xendit.co/v2/invoices/inv-123/expire",
      expect.objectContaining({ method: "POST" })
    );
  });

  it("tidak memanggil gateway untuk provider manual", async () => {
    const fetchMock = vi.fn();
    vi.stubGlobal("fetch", fetchMock);

    const result = await cancelProviderPayment({
      provider: "manual",
      orderId: "SOBAT-CANCEL-4",
    });

    expect(result.cancelled).toBe(false);
    expect(result.warning).toContain("tidak mendukung");
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it("menangani error jaringan dengan aman", async () => {
    process.env.MIDTRANS_SERVER_KEY = "Mid-server-test";
    vi.stubGlobal(
      "fetch",
      vi.fn(async () => {
        throw new Error("network down");
      })
    );

    const result = await cancelProviderPayment({
      provider: "midtrans",
      orderId: "SOBAT-CANCEL-5",
    });
    expect(result.cancelled).toBe(false);
    expect(result.warning).toContain("network down");
  });
});

describe("newOrderId", () => {
  it("memakai prefix SOBAT dan unik", () => {
    const ids = new Set(Array.from({ length: 50 }, () => newOrderId()));
    expect(ids.size).toBe(50);
    for (const id of ids) expect(id.startsWith("SOBAT-")).toBe(true);
  });
});
