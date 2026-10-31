// src/lib/collab-gamif.ts
// Gamifikasi tim: XP kolektif + level, dibangun di atas logika XP individu (gamif.ts)

import { db } from "./db";
import { clampXp, levelFromXp } from "./gamif";

export async function awardTeamXp(teamId: string, rawXp: number) {
  const xpDiperoleh = clampXp(rawXp);
  const team = await db.team.findUniqueOrThrow({ where: { id: teamId } });

  const newXp = team.xp + xpDiperoleh;
  const newLevel = levelFromXp(newXp);
  const levelNaik = newLevel > team.level;

  await db.team.update({
    where: { id: teamId },
    data: { xp: newXp, level: newLevel },
  });

  return { xpDiperoleh, newXp, newLevel, levelNaik };
}
