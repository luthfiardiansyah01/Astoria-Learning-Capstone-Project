import { beforeEach, describe, expect, it } from "vitest";
import { NextRequest } from "next/server";
import { db } from "@/lib/db";
import {
  createProject,
  createTeam,
  createUser,
  jsonRequest,
  resetDb,
  setAuthUser,
} from "./helpers";
import * as auditRoute from "@/app/api/admin/audit/route";
import * as cronRoute from "@/app/api/cron/reminders/route";

beforeEach(async () => {
  await resetDb();
  setAuthUser(null);
  delete process.env.CRON_SECRET;
  delete process.env.RESEND_API_KEY;
  delete process.env.EMAIL_FROM;
});

describe("audit log admin", () => {
  it("menolak pengguna non-admin", async () => {
    const user = await createUser();
    setAuthUser(user);
    const res = await auditRoute.GET(jsonRequest("/api/admin/audit", "GET"));
    expect(res.status).toBe(403);
  });

  it("mengembalikan log aksi admin", async () => {
    const admin = await createUser({ role: "admin" });
    setAuthUser(admin);
    await db.adminAuditLog.create({
      data: {
        adminId: admin.id,
        action: "plan.updated",
        targetType: "user",
        targetId: "user-target",
      },
    });

    const res = await auditRoute.GET(jsonRequest("/api/admin/audit", "GET"));
    expect(res.status).toBe(200);
    const body = (await res.json()) as { logs: Array<{ action: string }> };
    expect(body.logs).toHaveLength(1);
    expect(body.logs[0].action).toBe("plan.updated");
  });
});

describe("cron pengingat tenggat", () => {
  it("menolak tanpa CRON_SECRET", async () => {
    const res = await cronRoute.GET(new NextRequest("http://localhost/api/cron/reminders"));
    expect(res.status).toBe(503);
  });

  it("menolak secret yang salah", async () => {
    process.env.CRON_SECRET = "rahasia";
    const res = await cronRoute.GET(
      new NextRequest("http://localhost/api/cron/reminders", {
        headers: { authorization: "Bearer salah" },
      })
    );
    expect(res.status).toBe(401);
  });

  it("mengirim satu ringkasan per pengguna per hari", async () => {
    process.env.CRON_SECRET = "rahasia";
    const user = await createUser({ email: "tenggat@example.com" });
    const team = await createTeam(user.id);
    const project = await createProject(team.id);
    await db.task.create({
      data: {
        projectId: project.id,
        title: "Tugas mendekati tenggat",
        status: "todo",
        order: 0,
        assigneeId: user.id,
        dueDate: new Date(Date.now() + 60 * 60 * 1000),
      },
    });

    const request = () =>
      new NextRequest("http://localhost/api/cron/reminders", {
        headers: { authorization: "Bearer rahasia" },
      });

    const first = await cronRoute.GET(request());
    expect(first.status).toBe(200);
    const body = (await first.json()) as { sent: number };
    expect(body.sent).toBe(1);

    const second = await cronRoute.GET(request());
    const body2 = (await second.json()) as { sent: number; skipped: number };
    expect(body2.sent).toBe(0);
    expect(body2.skipped).toBe(1);
  });
});
