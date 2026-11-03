// GET /api/admin/users — daftar pengguna + paket aktif (khusus admin).
import { NextRequest, NextResponse } from "next/server";
import type { Prisma } from "@prisma/client";
import { db } from "@/lib/db";
import { requireAdmin } from "@/lib/current-user";
import { effectivePlan } from "@/lib/plans";

export const dynamic = "force-dynamic";

const PER_PAGE = 20;

export async function GET(req: NextRequest) {
  const auth = await requireAdmin();
  if (auth.res) return auth.res;

  const { searchParams } = new URL(req.url);
  const q = (searchParams.get("q") ?? "").trim();
  const planFilter = searchParams.get("plan") ?? "all";
  const page = Math.max(1, Number(searchParams.get("page") ?? 1) || 1);
  const now = new Date();

  const where: Prisma.UserWhereInput = {};
  if (q) {
    where.OR = [
      { name: { contains: q, mode: "insensitive" } },
      { email: { contains: q, mode: "insensitive" } },
    ];
  }
  if (planFilter === "premium") {
    where.AND = [
      {
        OR: [
          { role: "admin" },
          { plan: "premium", OR: [{ planExpiresAt: null }, { planExpiresAt: { gt: now } }] },
        ],
      },
    ];
  } else if (planFilter === "free") {
    where.role = { not: "admin" };
    where.AND = [{ OR: [{ plan: { not: "premium" } }, { planExpiresAt: { lte: now } }] }];
  }

  const [total, users, totalUsers, premiumUsers, trialUsed] = await Promise.all([
    db.user.count({ where }),
    db.user.findMany({
      where,
      orderBy: { createdAt: "desc" },
      skip: (page - 1) * PER_PAGE,
      take: PER_PAGE,
      select: {
        id: true,
        name: true,
        email: true,
        role: true,
        plan: true,
        planExpiresAt: true,
        trialUsedAt: true,
        createdAt: true,
        _count: { select: { documents: true, teamMemberships: true, payments: true } },
      },
    }),
    db.user.count(),
    db.user.count({
      where: {
        OR: [
          { role: "admin" },
          { role: { not: "admin" }, plan: "premium", OR: [{ planExpiresAt: null }, { planExpiresAt: { gt: now } }] },
        ],
      },
    }),
    db.user.count({ where: { trialUsedAt: { not: null } } }),
  ]);

  const stats = {
    total: totalUsers,
    free: totalUsers - premiumUsers,
    premium: premiumUsers,
    trialUsed,
  };

  return NextResponse.json({
    users: users.map((u) => ({ ...u, effectivePlan: effectivePlan(u) })),
    total,
    page,
    perPage: PER_PAGE,
    stats,
  });
}
