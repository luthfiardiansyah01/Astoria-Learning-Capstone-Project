// POST /api/collab/teams/[teamId]/members — tambah anggota lewat nama
// CATATAN: sementara pakai nama (bukan unik); pencarian lewat email menyusul.

import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { getCurrentUser } from "@/lib/current-user";
import { assertTeamMember, logActivity, ForbiddenError } from "@/lib/collab";
import { FALLBACK_RESPONSES } from "@/lib/fallback";
import { memberAddSchema, readBody } from "@/lib/validation";
import { createNotification } from "@/lib/collab-notify";
import { effectivePlan, PLAN_LIMITS } from "@/lib/plans";

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ teamId: string }> }
) {
  try {
    const user = await getCurrentUser();
    if (!user) return NextResponse.json({ error: "Belum masuk." }, { status: 401 });

    const { teamId } = await params;
    const requester = await assertTeamMember(user.id, teamId);
    if (requester.role !== "owner") {
      return NextResponse.json(
        { error: "Hanya owner tim yang bisa menambah anggota." },
        { status: 403 }
      );
    }

    const parsed = await readBody(req, memberAddSchema);
    if (!parsed.ok) return NextResponse.json({ error: parsed.error }, { status: 400 });
    const { name } = parsed.data;

    // SQLite tidak mendukung `mode: "insensitive"` di Prisma, jadi filter manual.
    const allUsers = await db.user.findMany({ select: { id: true, name: true, email: true, role: true } });
    const needle = name.trim().toLowerCase();
    const matches = allUsers.filter((u) => u.name.toLowerCase() === needle);
    if (matches.length === 0) {
      return NextResponse.json(
        { error: "Pengguna dengan nama ini belum terdaftar. Minta orang tersebut mendaftar di /register dulu." },
        { status: 404 }
      );
    }
    if (matches.length > 1) {
      return NextResponse.json(
        { error: "Ada lebih dari satu pengguna dengan nama ini. Gunakan nama lengkap yang lebih spesifik." },
        { status: 409 }
      );
    }
    const target = matches[0];

    const alreadyMember = await db.teamMember.findUnique({
      where: { teamId_userId: { teamId, userId: target.id } },
    });

    if (!alreadyMember) {
      const plan = effectivePlan(user);
      const memberCount = await db.teamMember.count({ where: { teamId } });
      const maxMembers = PLAN_LIMITS[plan].maxTeamMembers;
      if (memberCount >= maxMembers) {
        return NextResponse.json(
          {
            error: `Batas paket ${plan === "premium" ? "Premium" : "Free"}: maksimal ${maxMembers} anggota per tim. Upgrade untuk menambah anggota.`,
          },
          { status: 403 }
        );
      }
    }

    const member = await db.teamMember.upsert({
      where: { teamId_userId: { teamId, userId: target.id } },
      update: {},
      create: { teamId, userId: target.id, role: "member" },
      include: { user: { select: { id: true, name: true, email: true } } },
    });

    if (!alreadyMember) {
      const team = await db.team.findUnique({ where: { id: teamId }, select: { name: true } });
      await logActivity({
        teamId,
        userId: target.id,
        type: "member_joined",
        payload: { name: target.name },
      });
      await createNotification(target.id, {
        type: "member_added",
        title: `Kamu ditambahkan ke tim ${team?.name ?? ""}`.trim(),
        body: `Oleh ${user.name}`,
        link: "/collab",
      });
    }

    return NextResponse.json({ member });
  } catch (e) {
    if (e instanceof ForbiddenError) {
      return NextResponse.json({ error: e.message }, { status: 403 });
    }
    console.error("[/api/collab/teams/[teamId]/members POST]", e);
    return NextResponse.json({ error: FALLBACK_RESPONSES.api_error }, { status: 500 });
  }
}
