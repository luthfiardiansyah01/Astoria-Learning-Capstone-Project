import { beforeEach, describe, expect, it } from "vitest";
import { db } from "@/lib/db";
import { createUser, jsonRequest, resetDb, setAuthUser } from "./helpers";
import * as broadcastRoute from "@/app/api/admin/broadcast/route";

beforeEach(async () => {
  await resetDb();
  setAuthUser(null);
});

describe("siaran notifikasi admin", () => {
  it("menolak non-admin", async () => {
    const user = await createUser({ role: "mahasiswa" });
    setAuthUser(user);

    expect((await broadcastRoute.GET()).status).toBe(403);
    const res = await broadcastRoute.POST(
      jsonRequest("/api/admin/broadcast", "POST", { title: "Halo", body: "Pesan" })
    );
    expect(res.status).toBe(403);
  });

  it("melaporkan statistik perangkat", async () => {
    const admin = await createUser({ role: "admin" });
    const student = await createUser({ role: "mahasiswa" });
    await db.pushSubscription.create({
      data: { userId: student.id, endpoint: "https://push.example.com/a", p256dh: "k", auth: "a" },
    });
    setAuthUser(admin);

    const res = await broadcastRoute.GET();
    expect(res.status).toBe(200);
    const body = (await res.json()) as { users: number; devices: number; subscribers: number };
    expect(body.users).toBe(1);
    expect(body.devices).toBe(1);
    expect(body.subscribers).toBe(1);
  });

  it("membuat notifikasi untuk seluruh mahasiswa", async () => {
    const admin = await createUser({ role: "admin" });
    const a = await createUser({ role: "mahasiswa" });
    const b = await createUser({ role: "mahasiswa" });
    setAuthUser(admin);

    const res = await broadcastRoute.POST(
      jsonRequest("/api/admin/broadcast", "POST", {
        title: "Pemeliharaan",
        body: "Layanan berhenti pukul 23.00.",
      })
    );
    expect(res.status).toBe(200);
    const body = (await res.json()) as { users: number; sent: number };
    expect(body.users).toBe(2);

    const notifications = await db.notification.findMany({
      where: { userId: { in: [a.id, b.id] } },
    });
    expect(notifications).toHaveLength(2);
    expect(notifications[0].type).toBe("broadcast");
  });

  it("menolak judul kosong", async () => {
    const admin = await createUser({ role: "admin" });
    setAuthUser(admin);
    const res = await broadcastRoute.POST(
      jsonRequest("/api/admin/broadcast", "POST", { title: "", body: "" })
    );
    expect(res.status).toBe(400);
  });
});
