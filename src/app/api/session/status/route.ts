import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { db } from "@/lib/db";

export const dynamic = "force-dynamic";

export async function GET() {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) {
    return NextResponse.json({ authenticated: false, valid: false });
  }

  const user = await db.user.findUnique({
    where: { id: session.user.id },
    select: {
      activeSessionId: true,
      activeSessionAt: true,
      activeDevice: true,
      sessionConflictCount: true,
    },
  });
  if (!user) {
    return NextResponse.json({ authenticated: false, valid: false });
  }

  const valid = !user.activeSessionId || session.user.sessionId === user.activeSessionId;

  return NextResponse.json({
    authenticated: true,
    valid,
    activeSince: user.activeSessionAt,
    activeDevice: user.activeDevice,
    conflictCount: user.sessionConflictCount,
  });
}
