// GET  /api/collab/teams — daftar tim milik user saat ini
// POST /api/collab/teams — buat tim baru (pembuat jadi owner)

import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { getCurrentUser } from "@/lib/current-user";
import { FALLBACK_RESPONSES } from "@/lib/fallback";
import { readBody, teamCreateSchema } from "@/lib/validation";

export async function GET() {
  try {
    const user = await getCurrentUser();
    if (!user) return NextResponse.json({ error: "Belum masuk." }, { status: 401 });

    const teams = await db.team.findMany({
      where: { members: { some: { userId: user.id } } },
      include: {
        members: { include: { user: { select: { id: true, name: true } } } },
        projects: { select: { id: true, name: true, description: true } },
        badges: { select: { name: true } },
      },
      orderBy: { createdAt: "desc" },
    });

    return NextResponse.json({ teams });
  } catch (e) {
    console.error("[/api/collab/teams GET]", e);
    return NextResponse.json({ error: FALLBACK_RESPONSES.api_error }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const user = await getCurrentUser();
    if (!user) return NextResponse.json({ error: "Belum masuk." }, { status: 401 });

    const parsed = await readBody(req, teamCreateSchema);
    if (!parsed.ok) return NextResponse.json({ error: parsed.error }, { status: 400 });
    const { name } = parsed.data;

    const team = await db.team.create({
      data: {
        name: name.trim(),
        members: { create: { userId: user.id, role: "owner" } },
      },
      include: { members: { include: { user: { select: { id: true, name: true } } } } },
    });

    return NextResponse.json({ team });
  } catch (e) {
    console.error("[/api/collab/teams POST]", e);
    return NextResponse.json({ error: FALLBACK_RESPONSES.api_error }, { status: 500 });
  }
}
