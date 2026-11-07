import { logger } from "@/lib/logger";
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
    const allUsers = await db.user.findMany({ select: { id: true, name: true, role: true } });
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

    if (target.id === user.id) {
      return NextResponse.json({ error: "Kamu sudah menjadi owner tim ini." }, { status: 400 });
    }
    if (target.role === "admin") {
      return NextResponse.json({ error: "Akun admin tidak bisa diundang ke tim." }, { status: 400 });
    }

    const plan = effectivePlan(user);
    const maxMembers = PLAN_LIMITS[plan].maxTeamMembers;

    // Kunci baris tim agar batas anggota + undangan tidak bisa dilewati paralel.
    const result = await db.$transaction(async (tx) => {
      await tx.$queryRaw`SELECT id FROM "Team" WHERE id = ${teamId} FOR UPDATE`;

      const existingMember = await tx.teamMember.findUnique({
        where: { teamId_userId: { teamId, userId: target.id } },
        include: { user: { select: { id: true, name: true } } },
      });
      if (existingMember) return { kind: "member" as const, member: existingMember };

      const existingInvite = await tx.teamInvite.findUnique({
        where: { teamId_userId: { teamId, userId: target.id } },
      });
      if (existingInvite?.status === "pending") {
        return { kind: "invite" as const, invite: existingInvite, alreadyInvited: true };
      }

      const [memberCount, inviteCount] = await Promise.all([
        tx.teamMember.count({ where: { teamId } }),
        tx.teamInvite.count({ where: { teamId, status: "pending" } }),
      ]);
      if (memberCount + inviteCount >= maxMembers) return { kind: "limit" as const };

      const invite = existingInvite
        ? await tx.teamInvite.update({
            where: { id: existingInvite.id },
            data: { status: "pending", invitedById: user.id, respondedAt: null, createdAt: new Date() },
          })
        : await tx.teamInvite.create({
            data: { teamId, userId: target.id, invitedById: user.id },
          });
      return { kind: "invite" as const, invite, alreadyInvited: false };
    });

    if (result.kind === "member") {
      return NextResponse.json({ member: result.member, alreadyMember: true });
    }
    if (result.kind === "limit") {
      return NextResponse.json(
        {
          error: `Batas paket ${plan === "premium" ? "Premium" : "Free"}: maksimal ${maxMembers} anggota per tim. Upgrade untuk menambah anggota.`,
        },
        { status: 403 }
      );
    }

    if (!result.alreadyInvited) {
      const team = await db.team.findUnique({ where: { id: teamId }, select: { name: true } });
      await logActivity({
        teamId,
        userId: user.id,
        type: "member_invited",
        payload: { name: target.name },
      }).catch(() => null);
      await createNotification(target.id, {
        type: "team_invite",
        title: `Undangan bergabung ke tim ${team?.name ?? ""}`.trim(),
        body: `Diundang oleh ${user.name}. Buka Collab untuk menerima atau menolak.`,
        link: "/collab",
      }).catch(() => null);
    }

    return NextResponse.json({
      invite: {
        id: result.invite.id,
        userId: result.invite.userId,
        status: result.invite.status,
        user: { id: target.id, name: target.name },
      },
      pending: true,
      alreadyInvited: result.alreadyInvited,
    });
  } catch (e) {
    if (e instanceof ForbiddenError) {
      return NextResponse.json({ error: e.message }, { status: 403 });
    }
    logger.error("[/api/collab/teams/[teamId]/members POST]", { error: e });
    return NextResponse.json({ error: FALLBACK_RESPONSES.api_error }, { status: 500 });
  }
}
