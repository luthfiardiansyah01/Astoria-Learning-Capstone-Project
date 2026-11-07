import { beforeEach, describe, expect, it, vi } from "vitest";
import { db } from "@/lib/db";
import { chatComplete } from "@/lib/ai";
import {
  addMember,
  createDocument,
  createProject,
  createTask,
  createTeam,
  createUser,
  jsonRequest,
  params,
  resetDb,
  setAuthUser,
} from "./helpers";
import * as teamsRoute from "@/app/api/collab/teams/route";
import * as teamDetailRoute from "@/app/api/collab/teams/[teamId]/route";
import * as projectsRoute from "@/app/api/collab/projects/route";
import * as projectDetailRoute from "@/app/api/collab/projects/[projectId]/route";
import * as tasksRoute from "@/app/api/collab/projects/[projectId]/tasks/route";
import * as taskDetailRoute from "@/app/api/collab/tasks/[taskId]/route";
import * as membersRoute from "@/app/api/collab/teams/[teamId]/members/route";
import * as invitesRoute from "@/app/api/collab/invites/route";
import * as inviteResponseRoute from "@/app/api/collab/invites/[inviteId]/route";
import * as mentorRoute from "@/app/api/collab/tasks/[taskId]/mentor/route";
import * as notificationsRoute from "@/app/api/collab/notifications/route";
import * as analyticsRoute from "@/app/api/collab/analytics/route";
import * as activityRoute from "@/app/api/collab/projects/[projectId]/activity/route";
import * as removeMemberRoute from "@/app/api/collab/teams/[teamId]/members/[userId]/route";
import * as userSearchRoute from "@/app/api/collab/users/search/route";
import * as leaderboardRoute from "@/app/api/collab/teams/leaderboard/route";

beforeEach(async () => {
  await resetDb();
  setAuthUser(null);
  vi.mocked(chatComplete).mockReset();
  vi.mocked(chatComplete).mockResolvedValue("Saran mentor mock untuk tugas ini.");
});

describe("tim", () => {
  it("menolak tanpa sesi", async () => {
    expect((await teamsRoute.GET()).status).toBe(401);
    const res = await teamsRoute.POST(
      jsonRequest("/api/collab/teams", "POST", { name: "Tim" })
    );
    expect(res.status).toBe(401);
  });

  it("menolak nama tim kosong", async () => {
    const user = await createUser();
    setAuthUser(user);
    const res = await teamsRoute.POST(
      jsonRequest("/api/collab/teams", "POST", { name: " " })
    );
    expect(res.status).toBe(400);
  });

  it("membatasi Free pada 1 tim yang dibuat", async () => {
    const user = await createUser();
    setAuthUser(user);

    const first = await teamsRoute.POST(
      jsonRequest("/api/collab/teams", "POST", { name: "Tim Pertama" })
    );
    expect(first.status).toBe(200);

    const second = await teamsRoute.POST(
      jsonRequest("/api/collab/teams", "POST", { name: "Tim Kedua" })
    );
    expect(second.status).toBe(403);
    expect(await db.team.count()).toBe(1);
  });

  it("mengizinkan Premium membuat 10 tim", async () => {
    const owner = await createUser({ plan: "premium", planExpiresAt: null });
    for (let i = 0; i < 9; i++) await createTeam(owner.id, `Tim ${i}`);
    setAuthUser(owner);

    const tenth = await teamsRoute.POST(
      jsonRequest("/api/collab/teams", "POST", { name: "Tim ke-10" })
    );
    expect(tenth.status).toBe(200);

    const eleventh = await teamsRoute.POST(
      jsonRequest("/api/collab/teams", "POST", { name: "Tim ke-11" })
    );
    expect(eleventh.status).toBe(403);
  });

  it("hanya menampilkan tim yang diikuti", async () => {
    const user = await createUser();
    const other = await createUser();
    await createTeam(user.id, "Tim Saya");
    await createTeam(other.id, "Tim Orang");
    setAuthUser(user);

    const res = await teamsRoute.GET();
    const body = (await res.json()) as { teams: { name: string }[] };
    expect(res.status).toBe(200);
    expect(body.teams.map((t) => t.name)).toEqual(["Tim Saya"]);
  });

  it("owner bisa mengganti nama, anggota tidak", async () => {
    const owner = await createUser();
    const member = await createUser();
    const team = await createTeam(owner.id);
    await addMember(team.id, member.id);

    setAuthUser(owner);
    const ok = await teamDetailRoute.PATCH(
      jsonRequest(`/api/collab/teams/${team.id}`, "PATCH", { name: "Nama Baru" }),
      params({ teamId: team.id })
    );
    expect(ok.status).toBe(200);
    expect((await db.team.findUniqueOrThrow({ where: { id: team.id } })).name).toBe("Nama Baru");

    setAuthUser(member);
    const denied = await teamDetailRoute.PATCH(
      jsonRequest(`/api/collab/teams/${team.id}`, "PATCH", { name: "Bukan Hakmu" }),
      params({ teamId: team.id })
    );
    expect(denied.status).toBe(403);
  });

  it("hanya owner yang bisa menghapus tim", async () => {
    const owner = await createUser();
    const member = await createUser();
    const team = await createTeam(owner.id);
    await addMember(team.id, member.id);

    setAuthUser(member);
    expect(
      (
        await teamDetailRoute.DELETE(
          jsonRequest(`/api/collab/teams/${team.id}`, "DELETE"),
          params({ teamId: team.id })
        )
      ).status
    ).toBe(403);

    setAuthUser(owner);
    expect(
      (
        await teamDetailRoute.DELETE(
          jsonRequest(`/api/collab/teams/${team.id}`, "DELETE"),
          params({ teamId: team.id })
        )
      ).status
    ).toBe(200);
    expect(await db.team.count()).toBe(0);
  });
});

describe("proyek", () => {
  it("menolak non-anggota", async () => {
    const owner = await createUser();
    const outsider = await createUser();
    const team = await createTeam(owner.id);
    setAuthUser(outsider);
    const res = await projectsRoute.POST(
      jsonRequest("/api/collab/projects", "POST", { teamId: team.id, name: "Proyek" })
    );
    expect(res.status).toBe(403);
  });

  it("membatasi proyek Free pada 2 per tim", async () => {
    const owner = await createUser();
    const team = await createTeam(owner.id);
    await createProject(team.id, "Proyek 1");
    await createProject(team.id, "Proyek 2");
    setAuthUser(owner);

    const res = await projectsRoute.POST(
      jsonRequest("/api/collab/projects", "POST", { teamId: team.id, name: "Proyek 3" })
    );
    expect(res.status).toBe(403);
  });

  it("memakai paket owner, bukan paket anggota", async () => {
    const owner = await createUser({ plan: "premium", planExpiresAt: null });
    const member = await createUser({ plan: "free" });
    const team = await createTeam(owner.id);
    await addMember(team.id, member.id);
    await createProject(team.id, "Proyek 1");
    await createProject(team.id, "Proyek 2");
    setAuthUser(member);

    const res = await projectsRoute.POST(
      jsonRequest("/api/collab/projects", "POST", { teamId: team.id, name: "Proyek 3" })
    );
    expect(res.status).toBe(200);
  });

  it("menolak detail proyek untuk non-anggota", async () => {
    const owner = await createUser();
    const outsider = await createUser();
    const team = await createTeam(owner.id);
    const project = await createProject(team.id);
    setAuthUser(outsider);
    const res = await projectDetailRoute.GET(
      jsonRequest(`/api/collab/projects/${project.id}`, "GET"),
      params({ projectId: project.id })
    );
    expect(res.status).toBe(403);
  });

  it("hanya owner yang bisa menghapus proyek", async () => {
    const owner = await createUser();
    const member = await createUser();
    const team = await createTeam(owner.id);
    await addMember(team.id, member.id);
    const project = await createProject(team.id);

    setAuthUser(member);
    const denied = await projectDetailRoute.DELETE(
      jsonRequest(`/api/collab/projects/${project.id}`, "DELETE"),
      params({ projectId: project.id })
    );
    expect(denied.status).toBe(403);
    expect(await db.project.count({ where: { id: project.id } })).toBe(1);

    setAuthUser(owner);
    const ok = await projectDetailRoute.DELETE(
      jsonRequest(`/api/collab/projects/${project.id}`, "DELETE"),
      params({ projectId: project.id })
    );
    expect(ok.status).toBe(200);
    expect(await db.project.count({ where: { id: project.id } })).toBe(0);
  });

  it("anggota bisa melihat dan memperbarui proyek", async () => {
    const owner = await createUser();
    const member = await createUser();
    const team = await createTeam(owner.id);
    await addMember(team.id, member.id);
    const project = await createProject(team.id);
    setAuthUser(member);

    const getRes = await projectDetailRoute.GET(
      jsonRequest(`/api/collab/projects/${project.id}`, "GET"),
      params({ projectId: project.id })
    );
    expect(getRes.status).toBe(200);

    const patchRes = await projectDetailRoute.PATCH(
      jsonRequest(`/api/collab/projects/${project.id}`, "PATCH", { name: "Diperbarui" }),
      params({ projectId: project.id })
    );
    expect(patchRes.status).toBe(200);
    expect((await db.project.findUniqueOrThrow({ where: { id: project.id } })).name).toBe("Diperbarui");
  });
});

describe("tugas", () => {
  it("menolak non-anggota", async () => {
    const owner = await createUser();
    const outsider = await createUser();
    const team = await createTeam(owner.id);
    const project = await createProject(team.id);
    setAuthUser(outsider);
    const res = await tasksRoute.POST(
      jsonRequest(`/api/collab/projects/${project.id}/tasks`, "POST", { title: "Tugas" }),
      params({ projectId: project.id })
    );
    expect(res.status).toBe(403);
  });

  it("membatasi Free pada 10 tugas per proyek", async () => {
    const owner = await createUser();
    const team = await createTeam(owner.id);
    const project = await createProject(team.id);
    for (let i = 0; i < 10; i++) await createTask(project.id, `Tugas ${i}`);
    setAuthUser(owner);

    const res = await tasksRoute.POST(
      jsonRequest(`/api/collab/projects/${project.id}/tasks`, "POST", { title: "Tugas 11" }),
      params({ projectId: project.id })
    );
    expect(res.status).toBe(403);
  });

  it("mengizinkan Premium melewati batas Free", async () => {
    const owner = await createUser({ plan: "premium", planExpiresAt: null });
    const team = await createTeam(owner.id);
    const project = await createProject(team.id);
    for (let i = 0; i < 10; i++) await createTask(project.id, `Tugas ${i}`);
    setAuthUser(owner);

    const res = await tasksRoute.POST(
      jsonRequest(`/api/collab/projects/${project.id}/tasks`, "POST", { title: "Tugas 11" }),
      params({ projectId: project.id })
    );
    expect(res.status).toBe(200);
  });

  it("menolak assignee yang bukan anggota tim dan tidak membocorkan passwordHash", async () => {
    const owner = await createUser({ passwordHash: "hash-rahasia" });
    const outsider = await createUser();
    const team = await createTeam(owner.id);
    const project = await createProject(team.id);
    setAuthUser(owner);

    const denied = await tasksRoute.POST(
      jsonRequest(`/api/collab/projects/${project.id}/tasks`, "POST", {
        title: "Tugas",
        assigneeId: outsider.id,
      }),
      params({ projectId: project.id })
    );
    expect(denied.status).toBe(400);

    const ok = await tasksRoute.POST(
      jsonRequest(`/api/collab/projects/${project.id}/tasks`, "POST", {
        title: "Tugas",
        assigneeId: owner.id,
      }),
      params({ projectId: project.id })
    );
    expect(ok.status).toBe(200);
    const body = (await ok.json()) as { task: { assignee: Record<string, unknown> } };
    expect(body.task.assignee.id).toBe(owner.id);
    expect(body.task.assignee.passwordHash).toBeUndefined();
    expect(body.task.assignee.email).toBeUndefined();
  });

  it("menolak menautkan dokumen privat milik pengguna lain", async () => {
    const owner = await createUser();
    const other = await createUser();
    const team = await createTeam(owner.id);
    const project = await createProject(team.id);
    const task = await createTask(project.id);
    const doc = await createDocument(other.id, { status: "pending" });
    setAuthUser(owner);

    const res = await taskDetailRoute.PATCH(
      jsonRequest(`/api/collab/tasks/${task.id}`, "PATCH", { documentId: doc.id }),
      params({ taskId: task.id })
    );
    expect(res.status).toBe(403);
    expect((await db.task.findUniqueOrThrow({ where: { id: task.id } })).documentId).toBeNull();
  });

  it("mentor tidak memakai dokumen privat yang sudah tertaut", async () => {
    const owner = await createUser();
    const other = await createUser();
    const team = await createTeam(owner.id);
    const project = await createProject(team.id);
    const doc = await createDocument(other.id, { status: "pending" });
    const task = await createTask(project.id, "Tugas", { documentId: doc.id });
    setAuthUser(owner);

    const res = await mentorRoute.POST(
      jsonRequest(`/api/collab/tasks/${task.id}/mentor`, "POST", {
        question: "Jelaskan dokumen ini",
      }),
      params({ taskId: task.id })
    );
    expect(res.status).toBe(403);
    expect(chatComplete).not.toHaveBeenCalled();
  });

  it("menolak update kosong", async () => {
    const owner = await createUser();
    const team = await createTeam(owner.id);
    const project = await createProject(team.id);
    const task = await createTask(project.id);
    setAuthUser(owner);

    const res = await taskDetailRoute.PATCH(
      jsonRequest(`/api/collab/tasks/${task.id}`, "PATCH", {}),
      params({ taskId: task.id })
    );
    expect(res.status).toBe(400);
  });

  it("menyelesaikan tugas memberi XP ke tim", async () => {
    const owner = await createUser();
    const team = await createTeam(owner.id);
    const project = await createProject(team.id);
    const task = await createTask(project.id, "Tugas Selesai", { xpReward: 25 });
    setAuthUser(owner);

    const res = await taskDetailRoute.PATCH(
      jsonRequest(`/api/collab/tasks/${task.id}`, "PATCH", { status: "done" }),
      params({ taskId: task.id })
    );
    expect(res.status).toBe(200);
    const updatedTask = await db.task.findUniqueOrThrow({ where: { id: task.id } });
    const updatedTeam = await db.team.findUniqueOrThrow({ where: { id: team.id } });
    expect(updatedTask.status).toBe("done");
    // XP tugas dibatasi server maksimal 20 per penyelesaian.
    expect(updatedTeam.xp).toBe(20);
    expect(
      await db.activityEvent.count({ where: { taskId: task.id, type: "task_completed" } })
    ).toBe(1);
  });

  it("hanya memberi XP sekali saat tugas dibuka dan diselesaikan ulang", async () => {
    const owner = await createUser();
    const team = await createTeam(owner.id);
    const project = await createProject(team.id);
    const task = await createTask(project.id, "Tugas", { xpReward: 25 });
    setAuthUser(owner);

    for (const status of ["done", "todo", "done"]) {
      const res = await taskDetailRoute.PATCH(
        jsonRequest(`/api/collab/tasks/${task.id}`, "PATCH", { status }),
        params({ taskId: task.id })
      );
      expect(res.status).toBe(200);
    }

    expect((await db.team.findUniqueOrThrow({ where: { id: team.id } })).xp).toBe(20);
    expect(
      await db.activityEvent.count({ where: { taskId: task.id, type: "task_completed" } })
    ).toBe(1);
  });

  it("menolak perubahan tugas oleh non-anggota", async () => {
    const owner = await createUser();
    const outsider = await createUser();
    const team = await createTeam(owner.id);
    const project = await createProject(team.id);
    const task = await createTask(project.id);
    setAuthUser(outsider);

    const res = await taskDetailRoute.PATCH(
      jsonRequest(`/api/collab/tasks/${task.id}`, "PATCH", { status: "done" }),
      params({ taskId: task.id })
    );
    expect(res.status).toBe(403);
  });
});

describe("anggota tim", () => {
  it("hanya owner yang bisa menambah anggota", async () => {
    const owner = await createUser();
    const member = await createUser();
    const target = await createUser({ name: "Target Anggota" });
    const team = await createTeam(owner.id);
    await addMember(team.id, member.id);
    setAuthUser(member);

    const res = await membersRoute.POST(
      jsonRequest(`/api/collab/teams/${team.id}/members`, "POST", { name: target.name }),
      params({ teamId: team.id })
    );
    expect(res.status).toBe(403);
  });

  it("mengirim undangan lewat nama tanpa langsung menambah anggota", async () => {
    const owner = await createUser();
    const target = await createUser({ name: "Anggota Baru" });
    const team = await createTeam(owner.id);
    setAuthUser(owner);

    const res = await membersRoute.POST(
      jsonRequest(`/api/collab/teams/${team.id}/members`, "POST", { name: target.name }),
      params({ teamId: team.id })
    );
    expect(res.status).toBe(200);
    const body = (await res.json()) as {
      invite: { userId: string; status: string; user: Record<string, unknown> };
      pending: boolean;
    };
    expect(body.pending).toBe(true);
    expect(body.invite.userId).toBe(target.id);
    expect(body.invite.user.email).toBeUndefined();
    expect(await db.teamMember.count({ where: { teamId: team.id, userId: target.id } })).toBe(0);
    expect(await db.teamInvite.count({ where: { teamId: team.id, userId: target.id, status: "pending" } })).toBe(1);
    expect(await db.notification.count({ where: { userId: target.id, type: "team_invite" } })).toBe(1);
  });

  it("anggota dapat menerima undangan dan baru menjadi anggota", async () => {
    const owner = await createUser();
    const target = await createUser({ name: "Anggota Baru" });
    const team = await createTeam(owner.id);
    const invite = await db.teamInvite.create({
      data: { teamId: team.id, userId: target.id, invitedById: owner.id },
    });
    setAuthUser(target);

    const list = await invitesRoute.GET();
    expect(list.status).toBe(200);
    const listBody = (await list.json()) as { invites: { id: string }[] };
    expect(listBody.invites.map((i) => i.id)).toContain(invite.id);

    const res = await inviteResponseRoute.POST(
      jsonRequest(`/api/collab/invites/${invite.id}`, "POST", { action: "accept" }),
      params({ inviteId: invite.id })
    );
    expect(res.status).toBe(200);
    expect(await db.teamMember.count({ where: { teamId: team.id, userId: target.id } })).toBe(1);
    expect((await db.teamInvite.findUniqueOrThrow({ where: { id: invite.id } })).status).toBe("accepted");
  });

  it("anggota dapat menolak undangan", async () => {
    const owner = await createUser();
    const target = await createUser({ name: "Anggota Baru" });
    const team = await createTeam(owner.id);
    const invite = await db.teamInvite.create({
      data: { teamId: team.id, userId: target.id, invitedById: owner.id },
    });
    setAuthUser(target);

    const res = await inviteResponseRoute.POST(
      jsonRequest(`/api/collab/invites/${invite.id}`, "POST", { action: "decline" }),
      params({ inviteId: invite.id })
    );
    expect(res.status).toBe(200);
    expect(await db.teamMember.count({ where: { teamId: team.id, userId: target.id } })).toBe(0);
    expect((await db.teamInvite.findUniqueOrThrow({ where: { id: invite.id } })).status).toBe("declined");
  });

  it("pengguna lain tidak bisa menerima undangan orang lain", async () => {
    const owner = await createUser();
    const target = await createUser();
    const outsider = await createUser();
    const team = await createTeam(owner.id);
    const invite = await db.teamInvite.create({
      data: { teamId: team.id, userId: target.id, invitedById: owner.id },
    });
    setAuthUser(outsider);

    const res = await inviteResponseRoute.POST(
      jsonRequest(`/api/collab/invites/${invite.id}`, "POST", { action: "accept" }),
      params({ inviteId: invite.id })
    );
    expect(res.status).toBe(404);
    expect(await db.teamMember.count({ where: { teamId: team.id, userId: outsider.id } })).toBe(0);
  });

  it("tidak bisa mengundang akun admin", async () => {
    const owner = await createUser();
    const admin = await createUser({ role: "admin", name: "Admin Uji" });
    const team = await createTeam(owner.id);
    setAuthUser(owner);

    const res = await membersRoute.POST(
      jsonRequest(`/api/collab/teams/${team.id}/members`, "POST", { name: admin.name }),
      params({ teamId: team.id })
    );
    expect(res.status).toBe(400);
  });

  it("menolak nama yang tidak terdaftar", async () => {
    const owner = await createUser();
    const team = await createTeam(owner.id);
    setAuthUser(owner);
    const res = await membersRoute.POST(
      jsonRequest(`/api/collab/teams/${team.id}/members`, "POST", { name: "Tidak Ada" }),
      params({ teamId: team.id })
    );
    expect(res.status).toBe(404);
  });

  it("menolak nama ganda", async () => {
    const owner = await createUser();
    await createUser({ name: "Nama Ganda" });
    await createUser({ name: "Nama Ganda" });
    const team = await createTeam(owner.id);
    setAuthUser(owner);
    const res = await membersRoute.POST(
      jsonRequest(`/api/collab/teams/${team.id}/members`, "POST", { name: "Nama Ganda" }),
      params({ teamId: team.id })
    );
    expect(res.status).toBe(409);
  });

  it("membatasi Free pada 3 anggota termasuk owner", async () => {
    const owner = await createUser();
    const first = await createUser({ name: "Anggota Satu" });
    const second = await createUser({ name: "Anggota Dua" });
    const third = await createUser({ name: "Anggota Tiga" });
    const team = await createTeam(owner.id);
    await addMember(team.id, first.id);
    await addMember(team.id, second.id);
    setAuthUser(owner);

    const res = await membersRoute.POST(
      jsonRequest(`/api/collab/teams/${team.id}/members`, "POST", { name: third.name }),
      params({ teamId: team.id })
    );
    expect(res.status).toBe(403);
  });

  it("Premium dapat menambah anggota ke-4", async () => {
    const owner = await createUser({ plan: "premium", planExpiresAt: null });
    const first = await createUser({ name: "Anggota Satu" });
    const second = await createUser({ name: "Anggota Dua" });
    const third = await createUser({ name: "Anggota Tiga" });
    const fourth = await createUser({ name: "Anggota Empat" });
    const team = await createTeam(owner.id);
    await addMember(team.id, first.id);
    await addMember(team.id, second.id);
    await addMember(team.id, third.id);
    setAuthUser(owner);

    const res = await membersRoute.POST(
      jsonRequest(`/api/collab/teams/${team.id}/members`, "POST", { name: fourth.name }),
      params({ teamId: team.id })
    );
    expect(res.status).toBe(200);
  });
});

describe("Mentor AI tugas", () => {
  it("menolak non-anggota", async () => {
    const owner = await createUser();
    const outsider = await createUser();
    const team = await createTeam(owner.id);
    const project = await createProject(team.id);
    const task = await createTask(project.id);
    setAuthUser(outsider);

    const res = await mentorRoute.POST(
      jsonRequest(`/api/collab/tasks/${task.id}/mentor`, "POST", { question: "Apa itu ekonomi?" }),
      params({ taskId: task.id })
    );
    expect(res.status).toBe(403);
  });

  it("menjawab pertanyaan dan menyimpan riwayat", async () => {
    const owner = await createUser();
    const team = await createTeam(owner.id);
    const project = await createProject(team.id);
    const task = await createTask(project.id);
    setAuthUser(owner);

    const res = await mentorRoute.POST(
      jsonRequest(`/api/collab/tasks/${task.id}/mentor`, "POST", { question: "Apa itu ekonomi?" }),
      params({ taskId: task.id })
    );
    const body = (await res.json()) as { message: { content: string } };
    expect(res.status).toBe(200);
    expect(body.message.content).toContain("mock");
    expect(await db.taskChatMessage.count({ where: { taskId: task.id } })).toBe(2);
    expect(
      await db.activityEvent.count({ where: { taskId: task.id, type: "ai_mentor_used" } })
    ).toBe(1);
  });
});

describe("notifikasi dan analitik", () => {
  it("menolak notifikasi tanpa sesi", async () => {
    expect((await notificationsRoute.GET()).status).toBe(401);
  });

  it("mengembalikan dan menandai notifikasi dibaca", async () => {
    const user = await createUser();
    const notif = await db.notification.create({
      data: { userId: user.id, type: "member_added", title: "Halo" },
    });
    setAuthUser(user);

    const getRes = await notificationsRoute.GET();
    const body = (await getRes.json()) as { unreadCount: number; notifications: { id: string }[] };
    expect(body.unreadCount).toBe(1);
    expect(body.notifications[0].id).toBe(notif.id);

    const postRes = await notificationsRoute.POST(
      jsonRequest("/api/collab/notifications", "POST", { ids: [notif.id] })
    );
    expect(postRes.status).toBe(200);
    expect(await db.notification.count({ where: { userId: user.id, readAt: null } })).toBe(0);
  });

  it("mahasiswa hanya melihat analitik tim yang diikuti", async () => {
    const user = await createUser();
    const other = await createUser();
    await createTeam(user.id, "Tim Saya");
    await createTeam(other.id, "Tim Lain");
    setAuthUser(user);

    const res = await analyticsRoute.GET();
    const body = (await res.json()) as { scope: string; teams: { name: string }[] };
    expect(res.status).toBe(200);
    expect(body.scope).toBe("member");
    expect(body.teams.map((t) => t.name)).toEqual(["Tim Saya"]);
  });

  it("admin melihat analitik semua tim", async () => {
    const admin = await createUser({ role: "admin" });
    const other = await createUser();
    await createTeam(other.id, "Tim Lain");
    setAuthUser(admin);

    const res = await analyticsRoute.GET();
    const body = (await res.json()) as { scope: string; teams: unknown[] };
    expect(body.scope).toBe("admin");
    expect(body.teams.length).toBe(1);
  });

  it("menolak analitik tanpa sesi", async () => {
    expect((await analyticsRoute.GET()).status).toBe(401);
  });
});

describe("activity feed, pencarian anggota, dan leaderboard", () => {
  it("activity feed hanya untuk anggota proyek", async () => {
    const owner = await createUser();
    const outsider = await createUser();
    const team = await createTeam(owner.id);
    const project = await createProject(team.id);
    await db.activityEvent.create({
      data: {
        teamId: team.id,
        projectId: project.id,
        userId: owner.id,
        type: "task_created",
        payload: JSON.stringify({ title: "Tugas" }),
      },
    });

    setAuthUser(outsider);
    const denied = await activityRoute.GET(
      jsonRequest(`/api/collab/projects/${project.id}/activity`, "GET"),
      params({ projectId: project.id })
    );
    expect(denied.status).toBe(403);

    setAuthUser(owner);
    const ok = await activityRoute.GET(
      jsonRequest(`/api/collab/projects/${project.id}/activity`, "GET"),
      params({ projectId: project.id })
    );
    const body = (await ok.json()) as { activity: { type: string; payload: object }[] };
    expect(ok.status).toBe(200);
    expect(body.activity[0].type).toBe("task_created");
    expect(body.activity[0].payload).toEqual({ title: "Tugas" });
  });

  it("owner bisa mengeluarkan anggota, anggota bisa keluar sendiri", async () => {
    const owner = await createUser();
    const member = await createUser();
    const other = await createUser();
    const team = await createTeam(owner.id);
    await addMember(team.id, member.id);
    await addMember(team.id, other.id);

    setAuthUser(member);
    const leave = await removeMemberRoute.DELETE(
      jsonRequest(`/api/collab/teams/${team.id}/members/${member.id}`, "DELETE"),
      params({ teamId: team.id, userId: member.id })
    );
    expect(leave.status).toBe(200);

    setAuthUser(owner);
    const remove = await removeMemberRoute.DELETE(
      jsonRequest(`/api/collab/teams/${team.id}/members/${other.id}`, "DELETE"),
      params({ teamId: team.id, userId: other.id })
    );
    expect(remove.status).toBe(200);

    const removeOwner = await removeMemberRoute.DELETE(
      jsonRequest(`/api/collab/teams/${team.id}/members/${owner.id}`, "DELETE"),
      params({ teamId: team.id, userId: owner.id })
    );
    expect(removeOwner.status).toBe(400);
  });

  it("anggota biasa tidak bisa mengeluarkan anggota lain", async () => {
    const owner = await createUser();
    const member = await createUser();
    const other = await createUser();
    const team = await createTeam(owner.id);
    await addMember(team.id, member.id);
    await addMember(team.id, other.id);
    setAuthUser(member);

    const res = await removeMemberRoute.DELETE(
      jsonRequest(`/api/collab/teams/${team.id}/members/${other.id}`, "DELETE"),
      params({ teamId: team.id, userId: other.id })
    );
    expect(res.status).toBe(403);
  });

  it("pencarian anggota hanya untuk owner dan mengecualikan anggota lama", async () => {
    const owner = await createUser({ name: "Pemilik Tim" });
    const member = await createUser({ name: "Anggota Lama" });
    await createUser({ name: "Calon Anggota" });
    const team = await createTeam(owner.id);
    await addMember(team.id, member.id);

    setAuthUser(member);
    const denied = await userSearchRoute.GET(
      jsonRequest(`/api/collab/users/search?teamId=${team.id}&q=Calon`, "GET")
    );
    expect(denied.status).toBe(403);

    setAuthUser(owner);
    const missing = await userSearchRoute.GET(
      jsonRequest("/api/collab/users/search?q=Calon", "GET")
    );
    expect(missing.status).toBe(400);

    const res = await userSearchRoute.GET(
      jsonRequest(`/api/collab/users/search?teamId=${team.id}&q=Anggota`, "GET")
    );
    const body = (await res.json()) as { users: { name: string }[] };
    expect(res.status).toBe(200);
    expect(body.users.map((u) => u.name)).not.toContain("Anggota Lama");
    expect(body.users.map((u) => u.name)).toContain("Calon Anggota");
  });

  it("leaderboard mengurutkan tim berdasarkan XP", async () => {
    const first = await createUser();
    const second = await createUser();
    await db.team.create({ data: { name: "Tim A", xp: 10, members: { create: { userId: first.id, role: "owner" } } } });
    await db.team.create({ data: { name: "Tim B", xp: 50, members: { create: { userId: second.id, role: "owner" } } } });

    expect((await leaderboardRoute.GET()).status).toBe(401);
    setAuthUser(first);
    const res = await leaderboardRoute.GET();
    const body = (await res.json()) as { leaderboard: { name: string; rank: number }[] };
    expect(res.status).toBe(200);
    expect(body.leaderboard[0].name).toBe("Tim B");
    expect(body.leaderboard[0].rank).toBe(1);
  });
});
