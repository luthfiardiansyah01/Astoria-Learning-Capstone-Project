import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import {
  clientIp,
  getRateLimitStatus,
  guardAi,
  rateLimit,
  tooManyRequests,
} from "@/lib/rate-limit";

let counter = 0;
const uniqueId = (label: string) => `${label}-${Date.now()}-${counter++}`;

describe("rateLimit (fallback memori)", () => {
  beforeEach(() => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date("2026-06-01T12:00:00Z"));
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it("mengizinkan request sampai batas", async () => {
    const id = uniqueId("basic");
    expect(await rateLimit("unit", id, 2, 60)).toMatchObject({ ok: true, remaining: 1 });
    expect(await rateLimit("unit", id, 2, 60)).toMatchObject({ ok: true, remaining: 0 });
  });

  it("menolak request melewati batas dan memberi retryAfter", async () => {
    const id = uniqueId("limit");
    await rateLimit("unit", id, 2, 60);
    await rateLimit("unit", id, 2, 60);
    const result = await rateLimit("unit", id, 2, 60);
    expect(result.ok).toBe(false);
    expect(result.remaining).toBe(0);
    expect(result.retryAfter).toBe(60);
  });

  it("mereset counter setelah jendela berakhir", async () => {
    const id = uniqueId("reset");
    await rateLimit("unit", id, 1, 60);
    expect((await rateLimit("unit", id, 1, 60)).ok).toBe(false);
    vi.advanceTimersByTime(61_000);
    expect((await rateLimit("unit", id, 1, 60)).ok).toBe(true);
  });

  it("memisahkan counter per nama dan id", async () => {
    const id = uniqueId("separate");
    await rateLimit("fitur-a", id, 1, 60);
    expect((await rateLimit("fitur-b", id, 1, 60)).ok).toBe(true);
  });
});

describe("getRateLimitStatus", () => {
  beforeEach(() => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date("2026-06-01T12:00:00Z"));
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it("melaporkan pemakaian tanpa menambah counter", async () => {
    const id = uniqueId("status");
    await rateLimit("unit", id, 5, 60);
    await rateLimit("unit", id, 5, 60);
    const status = await getRateLimitStatus("unit", id, 5, 60);
    expect(status).toMatchObject({ used: 2, remaining: 3, limit: 5 });
    expect(status.resetAt).toBeGreaterThan(Date.now());
  });

  it("menampilkan counter kosong untuk id baru", async () => {
    const status = await getRateLimitStatus("unit", uniqueId("empty"), 5, 60);
    expect(status).toMatchObject({ used: 0, remaining: 5, limit: 5 });
  });

  it("mengembalikan status kosong setelah jendela berakhir", async () => {
    const id = uniqueId("expired");
    await rateLimit("unit", id, 5, 60);
    vi.advanceTimersByTime(61_000);
    const status = await getRateLimitStatus("unit", id, 5, 60);
    expect(status.used).toBe(0);
    expect(status.remaining).toBe(5);
  });
});

describe("clientIp", () => {
  it("mengambil IP pertama dari x-forwarded-for", () => {
    const headers = new Headers({ "x-forwarded-for": "10.0.0.1, 10.0.0.2" });
    expect(clientIp(headers)).toBe("10.0.0.1");
  });

  it("memakai x-real-ip sebagai fallback", () => {
    expect(clientIp({ "x-real-ip": "192.168.1.5" })).toBe("192.168.1.5");
  });

  it("mengembalikan unknown bila header tidak ada", () => {
    expect(clientIp(undefined)).toBe("unknown");
    expect(clientIp(new Headers())).toBe("unknown");
  });
});

describe("tooManyRequests", () => {
  it("mengembalikan 429 dengan Retry-After dan kode", async () => {
    const response = tooManyRequests({ ok: false, remaining: 0, retryAfter: 42 });
    expect(response.status).toBe(429);
    expect(response.headers.get("Retry-After")).toBe("42");
    const body = (await response.json()) as { code: string; error: string };
    expect(body.code).toBe("rate_limited");
    expect(body.error).toContain("42 detik");
  });
});

describe("guardAi", () => {
  beforeEach(() => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date("2026-06-01T12:00:00Z"));
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it("membatasi Free pada 5 request per menit", async () => {
    const id = uniqueId("free-ai");
    for (let i = 0; i < 5; i++) {
      expect(await guardAi(id, "free")).toBeNull();
    }
    const blocked = await guardAi(id, "free");
    expect(blocked?.status).toBe(429);
  });

  it("memberi ruang lebih besar untuk Premium", async () => {
    const id = uniqueId("premium-ai");
    for (let i = 0; i < 6; i++) {
      expect(await guardAi(id, "premium")).toBeNull();
    }
  });

  it("membatasi Free pada 30 request per hari", async () => {
    const id = uniqueId("free-day");
    for (let menit = 0; menit < 6; menit++) {
      for (let i = 0; i < 5; i++) {
        expect(await guardAi(id, "free")).toBeNull();
      }
      vi.advanceTimersByTime(60_000);
    }
    const blocked = await guardAi(id, "free");
    expect(blocked?.status).toBe(429);
    const body = (await blocked?.json()) as { code: string };
    expect(body.code).toBe("rate_limited");
  });
});
