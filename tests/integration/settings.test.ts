import { beforeEach, describe, expect, it } from "vitest";
import { db } from "@/lib/db";
import { createUser, jsonRequest, resetDb, setAuthUser } from "./helpers";
import * as settingsRoute from "@/app/api/profile/settings/route";

beforeEach(async () => {
  await resetDb();
  setAuthUser(null);
});

describe("pengaturan profil", () => {
  it("menolak permintaan tanpa login", async () => {
    expect((await settingsRoute.GET()).status).toBe(401);
  });

  it("mengembalikan nilai bawaan", async () => {
    const user = await createUser();
    setAuthUser(user);

    const res = await settingsRoute.GET();
    expect(res.status).toBe(200);
    const body = (await res.json()) as {
      theme: string;
      fontScale: string;
      reducedMotion: boolean;
      emailReminders: boolean;
    };
    expect(body.theme).toBe("system");
    expect(body.fontScale).toBe("normal");
    expect(body.reducedMotion).toBe(false);
    expect(body.emailReminders).toBe(true);
  });

  it("menyimpan tema, gerak minimal, dan pengingat email", async () => {
    const user = await createUser();
    setAuthUser(user);

    const res = await settingsRoute.PATCH(
      jsonRequest("/api/profile/settings", "PATCH", {
        theme: "dark",
        fontScale: "large",
        reducedMotion: true,
        emailReminders: false,
      })
    );
    expect(res.status).toBe(200);

    const saved = await db.user.findUniqueOrThrow({ where: { id: user.id } });
    expect(saved.theme).toBe("dark");
    expect(saved.fontScale).toBe("large");
    expect(saved.reducedMotion).toBe(true);
    expect(saved.emailReminders).toBe(false);
  });

  it("menyimpan nama tampilan", async () => {
    const user = await createUser();
    setAuthUser(user);

    const res = await settingsRoute.PATCH(
      jsonRequest("/api/profile/settings", "PATCH", { name: "Nama Baru" })
    );
    expect(res.status).toBe(200);
    const saved = await db.user.findUniqueOrThrow({ where: { id: user.id } });
    expect(saved.name).toBe("Nama Baru");
  });

  it("menolak tema yang tidak dikenal", async () => {
    const user = await createUser();
    setAuthUser(user);

    const res = await settingsRoute.PATCH(
      jsonRequest("/api/profile/settings", "PATCH", { theme: "neon" })
    );
    expect(res.status).toBe(400);
  });

  it("menolak ukuran teks yang tidak dikenal", async () => {
    const user = await createUser();
    setAuthUser(user);

    const res = await settingsRoute.PATCH(
      jsonRequest("/api/profile/settings", "PATCH", { fontScale: "raksasa" })
    );
    expect(res.status).toBe(400);
  });
});
