import { describe, expect, it } from "vitest";
import {
  BADGE_META,
  XP_LEVELS,
  checkBadgeTriggers,
  clampSkor,
  clampXp,
  levelFromXp,
  xpForNextLevel,
} from "@/lib/gamif";

describe("levelFromXp", () => {
  it("memetakan batas XP ke level yang benar", () => {
    expect(levelFromXp(0)).toBe(1);
    expect(levelFromXp(99)).toBe(1);
    expect(levelFromXp(100)).toBe(2);
    expect(levelFromXp(249)).toBe(2);
    expect(levelFromXp(250)).toBe(3);
    expect(levelFromXp(3999)).toBe(10);
    expect(levelFromXp(4000)).toBe(11);
    expect(levelFromXp(99_999)).toBe(XP_LEVELS.length);
  });

  it("tidak pernah menghasilkan level di bawah 1", () => {
    expect(levelFromXp(-100)).toBe(1);
  });
});

describe("xpForNextLevel", () => {
  it("menghitung progres di awal level", () => {
    expect(xpForNextLevel(0)).toEqual({ current: 0, needed: 100, pct: 0 });
  });

  it("menghitung progres di tengah level", () => {
    expect(xpForNextLevel(150)).toEqual({ current: 50, needed: 150, pct: 33 });
  });

  it("memakai rentang 1000 XP setelah level terakhir", () => {
    expect(xpForNextLevel(4000)).toEqual({ current: 0, needed: 1000, pct: 0 });
  });

  it("membatasi persentase pada 0-100", () => {
    const result = xpForNextLevel(99);
    expect(result.pct).toBeGreaterThanOrEqual(0);
    expect(result.pct).toBeLessThanOrEqual(100);
  });
});

describe("checkBadgeTriggers", () => {
  const base = {
    answeredInThisDoc: 0,
    streakDays: 0,
    avgLast5: null,
    isFirstLanjut: false,
    alreadyEarned: [] as string[],
  };

  it("memberi Pemberani untuk soal Lanjut pertama", () => {
    expect(checkBadgeTriggers({ ...base, isFirstLanjut: true })).toBe("Pemberani");
  });

  it("memberi Pembaca Setia setelah 5 soal dari dokumen yang sama", () => {
    expect(checkBadgeTriggers({ ...base, answeredInThisDoc: 5 })).toBe("Pembaca Setia");
  });

  it("memberi Pejuang Streak setelah 3 hari", () => {
    expect(checkBadgeTriggers({ ...base, streakDays: 3 })).toBe("Pejuang Streak");
  });

  it("memberi Bintang Kelas bila rata-rata 5 sesi di atas 85", () => {
    expect(checkBadgeTriggers({ ...base, avgLast5: 86 })).toBe("Bintang Kelas");
  });

  it("tidak memberi badge yang sudah dimiliki", () => {
    expect(
      checkBadgeTriggers({
        ...base,
        isFirstLanjut: true,
        answeredInThisDoc: 5,
        streakDays: 3,
        avgLast5: 90,
        alreadyEarned: ["Pemberani", "Pembaca Setia", "Pejuang Streak", "Bintang Kelas"],
      })
    ).toBeNull();
  });

  it("mendahulukan Pemberani dibanding badge lain", () => {
    expect(
      checkBadgeTriggers({
        ...base,
        isFirstLanjut: true,
        answeredInThisDoc: 10,
        streakDays: 10,
        avgLast5: 100,
      })
    ).toBe("Pemberani");
  });

  it("mengembalikan null bila belum ada trigger", () => {
    expect(checkBadgeTriggers({ ...base, avgLast5: 85 })).toBeNull();
  });
});

describe("clampXp dan clampSkor", () => {
  it("membatasi XP 0-20 dan membulatkan", () => {
    expect(clampXp(12.6)).toBe(13);
    expect(clampXp(-5)).toBe(0);
    expect(clampXp(99)).toBe(20);
  });

  it("memakai nilai aman untuk input bukan angka", () => {
    expect(clampXp("bukan angka")).toBe(2);
    expect(clampSkor("bukan angka")).toBe(0);
    expect(clampSkor(Number.NaN)).toBe(0);
  });

  it("membatasi skor 0-100", () => {
    expect(clampSkor(-1)).toBe(0);
    expect(clampSkor(100.4)).toBe(100);
    expect(clampSkor(72.5)).toBe(73);
  });
});

describe("BADGE_META", () => {
  it("memuat metadata untuk semua badge yang dikenal", () => {
    for (const name of ["Pembaca Setia", "Pejuang Streak", "Bintang Kelas", "Pemberani"]) {
      expect(BADGE_META[name]).toBeDefined();
      expect(BADGE_META[name].emoji.length).toBeGreaterThan(0);
    }
  });
});
