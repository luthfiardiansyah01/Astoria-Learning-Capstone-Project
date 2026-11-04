// src/lib/gamif.ts
// Logika gamifikasi: XP, level, dan trigger badge (Seksi 6 spesifikasi)

export const BADGE_META: Record<string, { emoji: string; desc: string }> = {
  "Pembaca Setia": { emoji: "📚", desc: "Menjawab 5 soal dari dokumen yang sama" },
  "Pejuang Streak": { emoji: "🔥", desc: "Aktif menjawab soal 3 hari berturut-turut" },
  "Bintang Kelas": { emoji: "⭐", desc: "Rata-rata skor quiz > 85 dari 5 sesi terakhir" },
  Pemberani: { emoji: "🦁", desc: "Menjawab soal tingkat Lanjut untuk pertama kali" },
};

export const XP_LEVELS = [0, 100, 250, 450, 700, 1000, 1400, 1900, 2500, 3200, 4000];

export const BADGE_THRESHOLDS = {
  answeredInDoc: 5,
  streakDays: 3,
  avgScore: 85,
} as const;

export function levelFromXp(xp: number): number {
  let level = 1;
  for (let i = 0; i < XP_LEVELS.length; i++) {
    if (xp >= XP_LEVELS[i]) level = i + 1;
  }
  return level;
}

export function xpForNextLevel(xp: number): { current: number; needed: number; pct: number } {
  const level = levelFromXp(xp);
  const currentFloor = XP_LEVELS[level - 1] ?? 0;
  const nextFloor = XP_LEVELS[level] ?? currentFloor + 1000;
  const needed = Math.max(nextFloor - currentFloor, 1);
  const progress = Math.max(0, Math.min(xp - currentFloor, needed));
  return {
    current: progress,
    needed,
    pct: Math.round((progress / needed) * 100),
  };
}

/** Cek trigger badge secara deterministik di server (penguji hasil AI). */
export function checkBadgeTriggers(stats: {
  answeredInThisDoc: number; // soal yang dijawab dari dokumen ini
  streakDays: number;
  avgLast5: number | null;
  isFirstLanjut: boolean;
  alreadyEarned: string[];
}): string | null {
  const { answeredInThisDoc, streakDays, avgLast5, isFirstLanjut, alreadyEarned } = stats;

  if (isFirstLanjut && !alreadyEarned.includes("Pemberani")) return "Pemberani";
  if (answeredInThisDoc >= BADGE_THRESHOLDS.answeredInDoc && !alreadyEarned.includes("Pembaca Setia"))
    return "Pembaca Setia";
  if (streakDays >= BADGE_THRESHOLDS.streakDays && !alreadyEarned.includes("Pejuang Streak"))
    return "Pejuang Streak";
  if (avgLast5 !== null && avgLast5 > BADGE_THRESHOLDS.avgScore && !alreadyEarned.includes("Bintang Kelas"))
    return "Bintang Kelas";
  return null;
}

/** Batas jawaban AI terhadap skema XP resmi. */
export function clampXp(xp: unknown): number {
  const n = Number(xp);
  if (!Number.isFinite(n)) return 2;
  return Math.max(0, Math.min(20, Math.round(n)));
}

export function clampSkor(skor: unknown): number {
  const n = Number(skor);
  if (!Number.isFinite(n)) return 0;
  return Math.max(0, Math.min(100, Math.round(n)));
}
