import { afterEach, describe, expect, it, vi } from "vitest";
import {
  PLAN_LIMITS,
  PLAN_META,
  effectivePlan,
  limitsFor,
  upgradeMessage,
} from "@/lib/plans";

afterEach(() => {
  vi.useRealTimers();
});

describe("effectivePlan", () => {
  it("selalu Premium untuk admin", () => {
    expect(effectivePlan({ role: "admin", plan: "free" })).toBe("premium");
  });

  it("Free untuk pengguna tanpa paket Premium", () => {
    expect(effectivePlan({ role: "mahasiswa", plan: "free" })).toBe("free");
    expect(effectivePlan({ role: "mahasiswa", plan: null })).toBe("free");
    expect(effectivePlan({ role: "mahasiswa" })).toBe("free");
  });

  it("Premium tanpa tanggal kedaluwarsa berlaku selamanya", () => {
    expect(effectivePlan({ plan: "premium", planExpiresAt: null })).toBe("premium");
  });

  it("Premium aktif bila tanggal masih di masa depan", () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date("2026-06-01T12:00:00Z"));
    expect(effectivePlan({ plan: "premium", planExpiresAt: "2026-06-02T12:00:00Z" })).toBe("premium");
  });

  it("kembali Free bila tanggal sudah lewat", () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date("2026-06-01T12:00:00Z"));
    expect(effectivePlan({ plan: "premium", planExpiresAt: "2026-05-31T12:00:00Z" })).toBe("free");
  });

  it("tepat pada waktu kedaluwarsa dianggap Free", () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date("2026-06-01T12:00:00Z"));
    expect(effectivePlan({ plan: "premium", planExpiresAt: new Date("2026-06-01T12:00:00Z") })).toBe("free");
  });
});

describe("PLAN_LIMITS", () => {
  it("Premium lebih tinggi dari Free pada semua batas", () => {
    for (const key of Object.keys(PLAN_LIMITS.free) as (keyof typeof PLAN_LIMITS.free)[]) {
      expect(PLAN_LIMITS.premium[key]).toBeGreaterThanOrEqual(PLAN_LIMITS.free[key]);
    }
    expect(PLAN_LIMITS.premium.aiPerDay).toBeGreaterThan(PLAN_LIMITS.free.aiPerDay);
    expect(PLAN_LIMITS.premium.maxTeams).toBeGreaterThan(PLAN_LIMITS.free.maxTeams);
  });

  it("limitsFor mengembalikan objek paket yang sesuai", () => {
    expect(limitsFor("free")).toBe(PLAN_LIMITS.free);
    expect(limitsFor("premium")).toBe(PLAN_LIMITS.premium);
  });

  it("metadata harga sesuai paket", () => {
    expect(PLAN_META.free.price).toBe("Rp0");
    expect(PLAN_META.premium.price).toContain("19.000");
  });
});

describe("upgradeMessage", () => {
  it("menyebut fitur dan batas paket", () => {
    const message = upgradeMessage("Unggah");
    expect(message).toContain("Unggah");
    expect(message).toContain("30/hari");
    expect(message).toContain("8.000");
  });
});
