// src/lib/collab-gamif.ts
// Gamifikasi tim: XP kolektif + level, dibangun di atas logika XP individu (gamif.ts)

import { db } from "./db";
import { clampXp, levelFromXp } from "./gamif";

export async function awardTeamXp(teamId: string, rawXp: number) {
  const xpDiperoleh = clampXp(rawXp);

  // Kunci baris tim agar dua penyelesaian tugas paralel tidak saling menimpa XP.
  return db.$transaction(async (tx) => {
    const [team] = await tx.$queryRaw<{ xp: number; level: number }[]>`
      SELECT xp, level FROM "Team" WHERE id = ${teamId} FOR UPDATE
    `;
    if (!team) throw new Error("Tim tidak ditemukan.");

    const newXp = team.xp + xpDiperoleh;
    const newLevel = levelFromXp(newXp);
    const levelNaik = newLevel > team.level;

    await tx.team.update({
      where: { id: teamId },
      data: { xp: newXp, level: newLevel },
    });

    return { xpDiperoleh, newXp, newLevel, levelNaik };
  });
}
