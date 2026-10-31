// src/lib/current-user.ts
// Resolusi pengguna dari sesi NextAuth + penjaga akses (login, admin, kepemilikan dokumen).

import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "./auth";
import { db } from "./db";

/** Pengguna dari sesi, atau null bila belum login. */
export async function getCurrentUser() {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) return null;
  return db.user.findUnique({ where: { id: session.user.id } });
}

export type CurrentUser = NonNullable<Awaited<ReturnType<typeof getCurrentUser>>>;

export function unauthorized() {
  return NextResponse.json({ error: "Belum masuk." }, { status: 401 });
}

export function forbidden(message = "Kamu tidak punya akses.") {
  return NextResponse.json({ error: message }, { status: 403 });
}

/**
 * Pola pemakaian di rute:
 *   const auth = await requireUser(); if (auth.res) return auth.res; const user = auth.user;
 */
export async function requireUser(): Promise<
  { user: CurrentUser; res: null } | { user: null; res: NextResponse }
> {
  const user = await getCurrentUser();
  return user ? { user, res: null } : { user: null, res: unauthorized() };
}

export async function requireAdmin(): Promise<
  { user: CurrentUser; res: null } | { user: null; res: NextResponse }
> {
  const user = await getCurrentUser();
  if (!user) return { user: null, res: unauthorized() };
  if (user.role !== "admin") return { user: null, res: forbidden("Hanya admin yang bisa mengakses ini.") };
  return { user, res: null };
}

/** Dokumen boleh dipakai bila milik sendiri, sudah disetujui moderator (dibagikan), atau pengguna adalah admin. */
export function canUseDocument(
  user: { id: string; role: string },
  doc: { uploaderId: string; status: string }
) {
  return user.role === "admin" || doc.uploaderId === user.id || doc.status === "approved";
}

/** Dokumen boleh diubah/dihapus hanya oleh pemilik atau admin. */
export function canManageDocument(user: { id: string; role: string }, doc: { uploaderId: string }) {
  return user.role === "admin" || doc.uploaderId === user.id;
}
