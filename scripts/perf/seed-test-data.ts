// Seed data sintetis untuk baseline performa (khusus database UJI).
// Jalankan: bun scripts/perf/seed-test-data.ts
//
// Aman: menolak berjalan bila DATABASE_URL bukan localhost.
// Target volume dapat diubah lewat env PERF_DOCS / PERF_TASKS / PERF_EVENTS.

const databaseUrl =
  process.env.TEST_DATABASE_URL ?? "postgresql://astoria:astoria@localhost:5434/astoria_test";

if (!/(?:localhost|127\.0\.0\.1|\[::1\])(?::\d+)?\//.test(databaseUrl)) {
  throw new Error("Seed perf hanya untuk database lokal (localhost).");
}

process.env.DATABASE_URL = databaseUrl;
process.env.DIRECT_URL = databaseUrl;

const { PrismaClient } = await import("@prisma/client");
const bcrypt = (await import("bcryptjs")).default;
const db = new PrismaClient({ log: [] });

const TARGET_DOCS = Number(process.env.PERF_DOCS ?? 5000);
const TARGET_TASKS = Number(process.env.PERF_TASKS ?? 1000);
const TARGET_EVENTS = Number(process.env.PERF_EVENTS ?? 5000);
const ADMIN_EMAIL = "bench-admin@test.local";
const PASSWORD = "bench-pass-123";

const statuses = ["todo", "in_progress", "review", "done"] as const;

async function main() {
  const passwordHash = await bcrypt.hash(PASSWORD, 12);

  const admin = await db.user.upsert({
    where: { email: ADMIN_EMAIL },
    update: { passwordHash, role: "admin", plan: "premium", emailVerifiedAt: new Date() },
    create: {
      email: ADMIN_EMAIL,
      name: "Bench Admin",
      role: "admin",
      plan: "premium",
      passwordHash,
      emailVerifiedAt: new Date(),
    },
  });

  const members = await Promise.all(
    Array.from({ length: 10 }, (_, i) =>
      db.user.upsert({
        where: { email: `bench-user-${i}@test.local` },
        update: {},
        create: {
          email: `bench-user-${i}@test.local`,
          name: `Bench User ${i}`,
          role: "mahasiswa",
          plan: i % 3 === 0 ? "premium" : "free",
          passwordHash,
          emailVerifiedAt: new Date(),
          xp: (i + 1) * 37,
        },
      })
    )
  );

  const team = await db.team.upsert({
    where: { id: "bench-team" },
    update: {},
    create: { id: "bench-team", name: "Bench Team", xp: 1200, level: 4 },
  });

  await db.teamMember.upsert({
    where: { teamId_userId: { teamId: team.id, userId: admin.id } },
    update: { role: "owner" },
    create: { teamId: team.id, userId: admin.id, role: "owner" },
  });
  for (const member of members.slice(0, 5)) {
    await db.teamMember.upsert({
      where: { teamId_userId: { teamId: team.id, userId: member.id } },
      update: {},
      create: { teamId: team.id, userId: member.id, role: "member" },
    });
  }

  const existingDocs = await db.document.count({ where: { uploaderId: admin.id } });
  if (existingDocs < TARGET_DOCS) {
    const body = "Materi modul pembelajaran jarak jauh. ".repeat(40);
    await db.document.createMany({
      data: Array.from({ length: TARGET_DOCS - existingDocs }, (_, i) => ({
        fileName: `bench-modul-${String(existingDocs + i).padStart(4, "0")}.pdf`,
        content: body,
        wordCount: 200,
        status: i % 7 === 0 ? "pending" : "approved",
        uploaderId: admin.id,
      })),
    });
  }

  for (let p = 0; p < 3; p++) {
    const project = await db.project.upsert({
      where: { id: `bench-project-${p}` },
      update: {},
      create: {
        id: `bench-project-${p}`,
        name: `Bench Project ${p}`,
        description: "Proyek uji performa",
        teamId: team.id,
      },
    });
    const target = p === 0 ? TARGET_TASKS : 100;
    const existing = await db.task.count({ where: { projectId: project.id } });
    if (existing >= target) continue;

    const counters: Record<string, number> = {};
    for (let i = 0; i < existing; i++) {
      const status = statuses[i % statuses.length];
      counters[status] = (counters[status] ?? 0) + 1;
    }
    await db.task.createMany({
      data: Array.from({ length: target - existing }, (_, i) => {
        const status = statuses[(existing + i) % statuses.length];
        const order = counters[status] ?? 0;
        counters[status] = order + 1;
        return {
          projectId: project.id,
          title: `Tugas ${existing + i}`,
          status,
          order,
          assigneeId: members[i % members.length].id,
        };
      }),
    });
  }

  const existingEvents = await db.activityEvent.count({ where: { teamId: team.id } });
  if (existingEvents < TARGET_EVENTS) {
    await db.activityEvent.createMany({
      data: Array.from({ length: TARGET_EVENTS - existingEvents }, (_, i) => ({
        teamId: team.id,
        projectId: "bench-project-0",
        userId: members[i % members.length].id,
        type: i % 2 === 0 ? "task_created" : "task_moved",
        payload: JSON.stringify({ i }),
      })),
    });
  }

  console.log(
    JSON.stringify(
      {
        admin: admin.email,
        users: await db.user.count(),
        documents: await db.document.count(),
        tasksProject0: await db.task.count({ where: { projectId: "bench-project-0" } }),
        events: await db.activityEvent.count(),
      },
      null,
      2
    )
  );
}

try {
  await main();
} finally {
  await db.$disconnect();
}

export {};
