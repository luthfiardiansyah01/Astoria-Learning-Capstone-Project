import { logger } from "@/lib/logger";
// POST /api/collab/invites/[inviteId] — terima atau tolak undangan tim.
import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { getCurrentUser } from "@/lib/current-user";
import { logActivity } from "@/lib/collab";
import { createNotification } from "@/lib/collab-notify";
import { FALLBACK_RESPONSES } from "@/lib/fallback";
import { PLAN_LIMITS } from "@/lib/plans";
import { inviteResponseSchema, readBody } from "@/lib/validation";
import { teamOwnerPlan } from "@/lib/team-plan";

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ inviteId: string }> }
) {
  try {
    const user = await getCurrentUser();
    if (!user) return NextResponse.json({ error: "Belum masuk." }, { status: 401 });

    const { inviteId } = await params;
    const parsed = await readBody(req, inviteResponseSchema);
    if (!parsed.ok) return NextResponse.json({ error: parsed.error }, { status: 400 });

    const invite = await db.teamInvite.findUnique({
      where: { id: inviteId },
      include: {
        team: { select: { id: true, name: true } },
        invitedBy: { select: { id: true, name: true } },
      },
    });
    if (!invite || invite.userId !== user.id) {
      return NextResponse.json({ error: "Undangan tidak ditemukan." }, { status: 404 });
    }
    if (invite.status !== "pending") {
      return NextResponse.json({ error: "Undangan sudah diproses." }, { status: 409 });
    }

    if (parsed.data.action === "decline") {
      const claimed = await db.teamInvite.updateMany({
        where: { id: invite.id, userId: user.id, status: "pending" },
        data: { status: "declined", respondedAt: new Date() },
      });
      if (claimed.count === 0) {
        return NextResponse.json({ error: "Undangan sudah diproses." }, { status: 409 });
      }
      await createNotification(invite.invitedBy.id, {
        type: "team_invite_declined",
        title: `${user.name} menolak undangan tim ${invite.team.name}`,
        body: "Undangan tidak diterima.",
        link: "/collab",
      }).catch(() => null);
      return NextResponse.json({ ok: true, status: "declined" });
    }

    const existingMember = await db.teamMember.findUnique({
      where: { teamId_userId: { teamId: invite.teamId, userId: user.id } },
    });
    if (existingMember) {
      await db.teamInvite.updateMany({
        where: { id: invite.id, userId: user.id, status: "pending" },
        data: { status: "accepted", respondedAt: new Date() },
      });
      return NextResponse.json({ ok: true, status: "accepted", teamId: invite.teamId, alreadyMember: true });
    }

    const plan = await teamOwnerPlan(invite.teamId, user);
    const memberCount = await db.teamMember.count({ where: { teamId: invite.teamId } });
    if (memberCount >= PLAN_LIMITS[plan].maxTeamMembers) {
      return NextResponse.json(
        { error: "Tim sudah mencapai batas anggota paket owner." },
        { status: 403 }
      );
    }

    const accepted = await db.$transaction(async (tx) => {
      const claimed = await tx.teamInvite.updateMany({
        where: { id: invite.id, userId: user.id, status: "pending" },
        data: { status: "accepted", respondedAt: new Date() },
      });
      if (claimed.count === 0) return false;
      await tx.teamMember.create({
        data: { teamId: invite.teamId, userId: user.id, role: "member" },
      });
      return true;
    });

    if (!accepted) {
      return NextResponse.json({ error: "Undangan sudah diproses." }, { status: 409 });
    }

    await logActivity({
      teamId: invite.teamId,
      userId: user.id,
      type: "member_joined",
      payload: { name: user.name },
    }).catch(() => null);
    await createNotification(invite.invitedBy.id, {
      type: "member_added",
      title: `${user.name} bergabung ke tim ${invite.team.name}`,
      body: "Undangan diterima.",
      link: "/collab",
    }).catch(() => null);

    return NextResponse.json({ ok: true, status: "accepted", teamId: invite.teamId });
  } catch (e) {
    logger.error("[/api/collab/invites/[inviteId] POST]", { error: e });
    return NextResponse.json({ error: FALLBACK_RESPONSES.api_error }, { status: 500 });
  }
}
