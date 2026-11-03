import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { updateStreak, formatLastActive, wibNow } from "@/lib/user";

describe("updateStreak", () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it("mempertahankan streak bila aktif di hari yang sama", () => {
    vi.setSystemTime(new Date(2026, 0, 15, 18, 0, 0));
    expect(updateStreak(new Date(2026, 0, 15, 8, 0, 0), 5)).toBe(5);
  });

  it("menaikkan streak bila terakhir aktif kemarin", () => {
    vi.setSystemTime(new Date(2026, 0, 15, 12, 0, 0));
    expect(updateStreak(new Date(2026, 0, 14, 20, 0, 0), 5)).toBe(6);
  });

  it("mereset streak bila terakhir aktif lebih dari sehari", () => {
    vi.setSystemTime(new Date(2026, 0, 15, 12, 0, 0));
    expect(updateStreak(new Date(2026, 0, 12, 12, 0, 0), 9)).toBe(1);
  });

  it("memberi streak minimal 1 untuk pengguna baru", () => {
    vi.setSystemTime(new Date(2026, 0, 15, 12, 0, 0));
    expect(updateStreak(new Date(2026, 0, 15, 12, 0, 0), 0)).toBe(1);
  });

  it("mengabaikan jam dan hanya membandingkan tanggal", () => {
    vi.setSystemTime(new Date(2026, 0, 15, 23, 59, 0));
    expect(updateStreak(new Date(2026, 0, 14, 0, 1, 0), 2)).toBe(3);
  });
});

describe("formatLastActive", () => {
  beforeEach(() => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date("2026-06-01T12:00:00Z"));
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it("menampilkan 'baru saja' untuk kurang dari satu menit", () => {
    expect(formatLastActive(new Date("2026-06-01T11:59:30Z"))).toBe("baru saja");
  });

  it("menampilkan menit", () => {
    expect(formatLastActive(new Date("2026-06-01T11:55:00Z"))).toBe("5 menit lalu");
  });

  it("menampilkan jam", () => {
    expect(formatLastActive(new Date("2026-06-01T09:00:00Z"))).toBe("3 jam lalu");
  });

  it("menampilkan hari", () => {
    expect(formatLastActive(new Date("2026-05-29T12:00:00Z"))).toBe("3 hari lalu");
  });
});

describe("wibNow", () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it("memakai format jam WIB 24 jam", () => {
    vi.setSystemTime(new Date("2026-06-01T12:05:00+07:00"));
    const result = wibNow();
    expect(result.clock).toBe("12.05");
    expect(result.hour).toBe(12);
    expect(result.label).toBe("pukul 12.05 WIB");
  });

  it("memakai dua digit untuk jam dan menit", () => {
    vi.setSystemTime(new Date("2026-06-01T07:03:00+07:00"));
    const result = wibNow();
    expect(result.clock).toBe("07.03");
    expect(result.label).toContain("WIB");
  });
});
