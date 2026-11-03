// Kapasitas tim mengikuti paket owner tim, bukan paket anggota yang kebetulan
// membuat proyek/tugas. Dengan begitu satu tim punya batas yang konsisten.
import { db } from "./db";
import { effectivePlan, type Plan } from "./plans";

type PlanUser = {
  role?: string | null;
  plan?: string | null;
  planExpiresAt?: Date | string | null;
};

export async function teamOwnerPlan(teamId: string, fallback: PlanUser): Promise<Plan> {
  const owner = await db.teamMember.findFirst({
    where: { teamId, role: "owner" },
    include: {
      user: { select: { role: true, plan: true, planExpiresAt: true } },
    },
  });

  return effectivePlan(owner?.user ?? fallback);
}
