// Definisi paket freemium. File ini aman diimpor server maupun client.
export type Plan = "free" | "premium";

export interface PlanLimits {
  aiPerMinute: number;
  aiPerDay: number;
  maxDocChars: number;
  maxPdfBytes: number;
  maxTextBytes: number;
  maxTeams: number;
  maxProjectsPerTeam: number;
  maxTasksPerProject: number;
  maxTeamMembers: number;
}

export const PLAN_LIMITS: Record<Plan, PlanLimits> = {
  free: {
    aiPerMinute: 5,
    aiPerDay: 30,
    maxDocChars: 8_000,
    maxPdfBytes: 2 * 1024 * 1024,
    maxTextBytes: 1 * 1024 * 1024,
    maxTeams: 1,
    maxProjectsPerTeam: 2,
    maxTasksPerProject: 10,
    maxTeamMembers: 3,
  },
  premium: {
    aiPerMinute: 20,
    aiPerDay: 300,
    maxDocChars: 20_000,
    maxPdfBytes: 5 * 1024 * 1024,
    maxTextBytes: 1 * 1024 * 1024,
    maxTeams: 10,
    maxProjectsPerTeam: 10,
    maxTasksPerProject: 100,
    maxTeamMembers: 30,
  },
};

export const PLAN_META = {
  free: {
    name: "Free",
    price: "Rp0",
    description: "Untuk mencoba fitur utama.",
  },
  premium: {
    name: "Premium",
    price: "Rp19.000/bulan",
    description: "Untuk mahasiswa yang aktif belajar dan berkolaborasi.",
  },
} as const;

export function effectivePlan(user: {
  role?: string | null;
  plan?: string | null;
  planExpiresAt?: Date | string | null;
}): Plan {
  if (user.role === "admin") return "premium";
  if (user.plan !== "premium") return "free";
  if (!user.planExpiresAt) return "premium";
  return new Date(user.planExpiresAt).getTime() > Date.now() ? "premium" : "free";
}

export function limitsFor(plan: Plan): PlanLimits {
  return PLAN_LIMITS[plan];
}

export function upgradeMessage(feature: string, plan: Plan = "free"): string {
  const limits = PLAN_LIMITS[plan];
  return `${feature} paket Free dibatasi. Upgrade ke Premium untuk batas lebih tinggi (AI ${limits.aiPerDay}/hari, dokumen ${limits.maxDocChars.toLocaleString("id-ID")} karakter).`;
}
