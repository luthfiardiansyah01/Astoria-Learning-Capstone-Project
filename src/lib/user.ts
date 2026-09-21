// src/lib/user.ts
// Helper pengguna demo (single-user demo untuk mahasiswa & admin)

import { db } from "./db";

export const DEMO_STUDENT_ID = "demo-student-ut";
export const DEMO_ADMIN_ID = "demo-admin-ut";

export async function getOrCreateUsers() {
  // upsert → tahan race condition saat beberapa request bersamaan
  const student = await db.user.upsert({
    where: { id: DEMO_STUDENT_ID },
    update: {},
    create: {
      id: DEMO_STUDENT_ID,
      name: "Raka Pratama",
      role: "mahasiswa",
      xp: 40,
      level: 1,
      streakDays: 1,
    },
  });

  const admin = await db.user.upsert({
    where: { id: DEMO_ADMIN_ID },
    update: {},
    create: { id: DEMO_ADMIN_ID, name: "Admin Astoria", role: "admin" },
  });

  return { student, admin };
}

/**
 * Perbarui streak belajar: jika aktif hari ini → tetap;
 * kemarin → +1; lebih lama → reset ke 1.
 */
export function updateStreak(lastActive: Date, streakDays: number): number {
  const now = new Date();
  const dayMs = 24 * 60 * 60 * 1000;
  const last = new Date(lastActive);
  const lastDay = new Date(
    last.getFullYear(),
    last.getMonth(),
    last.getDate()
  ).getTime();
  const today = new Date(
    now.getFullYear(),
    now.getMonth(),
    now.getDate()
  ).getTime();

  const diff = Math.round((today - lastDay) / dayMs);
  if (diff === 0) return Math.max(streakDays, 1);
  if (diff === 1) return streakDays + 1;
  return 1;
}

export function formatLastActive(date: Date): string {
  const diffMs = Date.now() - date.getTime();
  const menit = Math.floor(diffMs / 60000);
  if (menit < 1) return "baru saja";
  if (menit < 60) return `${menit} menit lalu`;
  const jam = Math.floor(menit / 60);
  if (jam < 24) return `${jam} jam lalu`;
  const hari = Math.floor(jam / 24);
  return `${hari} hari lalu`;
}

/** Waktu WIB (UTC+7) saat ini — sesuai spesifikasi sapaan mentor. */
export function wibNow(): { clock: string; hour: number; label: string } {
  const now = new Date();
  const wib = new Date(now.getTime() + (7 * 60 + now.getTimezoneOffset()) * 60000);
  const hour = wib.getHours();
  const clock = `${String(hour).padStart(2, "0")}.${String(wib.getMinutes()).padStart(2, "0")}`;
  return { clock, hour, label: `pukul ${clock} WIB` };
}
