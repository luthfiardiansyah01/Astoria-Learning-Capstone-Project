import { NextRequest } from "next/server";
import type { Prisma } from "@prisma/client";
import { db } from "@/lib/db";

let sequence = 0;

export function setAuthUser(user: Record<string, unknown> | null) {
  (globalThis as typeof globalThis & { __sobadiAuthUser?: Record<string, unknown> | null }).__sobadiAuthUser =
    user;
}

export async function resetDb() {
  const tables = await db.$queryRaw<{ tablename: string }[]>`
    SELECT tablename FROM pg_tables
    WHERE schemaname = 'public' AND tablename <> '_prisma_migrations'
  `;
  if (tables.length === 0) return;
  const list = tables.map((t) => `"public"."${t.tablename}"`).join(", ");
  await db.$executeRawUnsafe(`TRUNCATE TABLE ${list} RESTART IDENTITY CASCADE`);
}

export async function createUser(overrides: Partial<Prisma.UserUncheckedCreateInput> = {}) {
  sequence += 1;
  const stamp = `${Date.now()}-${sequence}`;
  return db.user.create({
    data: {
      id: `user-${stamp}`,
      name: `User ${sequence}`,
      email: `user-${stamp}@example.com`,
      role: "mahasiswa",
      plan: "free",
      ...overrides,
    },
  });
}

export async function createDocument(
  uploaderId: string,
  overrides: Partial<Prisma.DocumentUncheckedCreateInput> = {}
) {
  return db.document.create({
    data: {
      fileName: "modul-test.txt",
      content: "Ekonomi membahas permintaan dan penawaran. Permintaan turun saat harga naik.",
      wordCount: 12,
      uploaderId,
      status: "approved",
      ...overrides,
    },
  });
}

export async function createTeam(ownerId: string, name = "Tim Test") {
  return db.team.create({
    data: {
      name,
      members: { create: { userId: ownerId, role: "owner" } },
    },
    include: { members: true },
  });
}

export async function addMember(teamId: string, userId: string, role = "member") {
  return db.teamMember.create({ data: { teamId, userId, role } });
}

export async function createProject(teamId: string, name = "Proyek Test") {
  return db.project.create({ data: { teamId, name } });
}

export async function createTask(
  projectId: string,
  title = "Tugas Test",
  overrides: Partial<Prisma.TaskUncheckedCreateInput> = {}
) {
  if (overrides.order !== undefined) {
    return db.task.create({
      data: { projectId, title, xpReward: 10, ...overrides },
    });
  }
  const status = overrides.status ?? "todo";
  const last = await db.task.findFirst({
    where: { projectId, status },
    orderBy: { order: "desc" },
    select: { order: true },
  });
  return db.task.create({
    data: {
      projectId,
      title,
      xpReward: 10,
      status,
      ...overrides,
      order: (last?.order ?? -1) + 1,
    },
  });
}

export function jsonRequest(path: string, method = "POST", body?: unknown) {
  return new NextRequest(`http://localhost:3000${path}`, {
    method,
    headers: body === undefined ? undefined : { "Content-Type": "application/json" },
    body: body === undefined ? undefined : JSON.stringify(body),
  });
}

export function params<T extends Record<string, string>>(value: T) {
  return { params: Promise.resolve(value) };
}

export function json(data: unknown) {
  return data as Record<string, unknown>;
}
