import { beforeEach, describe, expect, it } from "vitest";
import { db } from "@/lib/db";
import { createUser, jsonRequest, resetDb, setAuthUser } from "./helpers";
import * as subscribeRoute from "@/app/api/push/subscribe/route";
import * as testRoute from "@/app/api/push/test/route";

const ENDPOINT = "https://push.example.com/subscription/abc";

beforeEach(async () => {
  await resetDb();
  setAuthUser(null);
});

describe("langganan Web Push", () => {
  it("menolak tanpa login", async () => {
    const res = await subscribeRoute.POST(
      jsonRequest("/api/push/subscribe", "POST", {
        endpoint: ENDPOINT,
        keys: { p256dh: "kunci-p256dh", auth: "kunci-auth" },
      })
    );
    expect(res.status).toBe(401);
    expect((await testRoute.POST()).status).toBe(401);
  });

  it("menyimpan langganan perangkat", async () => {
    const user = await createUser();
    setAuthUser(user);

    const res = await subscribeRoute.POST(
      jsonRequest("/api/push/subscribe", "POST", {
        endpoint: ENDPOINT,
        keys: { p256dh: "kunci-p256dh", auth: "kunci-auth" },
      })
    );
    expect(res.status).toBe(200);

    const row = await db.pushSubscription.findUnique({ where: { endpoint: ENDPOINT } });
    expect(row?.userId).toBe(user.id);
    expect(row?.p256dh).toBe("kunci-p256dh");
  });

  it("memperbarui langganan yang sama tanpa duplikasi", async () => {
    const user = await createUser();
    setAuthUser(user);

    const body = {
      endpoint: ENDPOINT,
      keys: { p256dh: "kunci-baru", auth: "auth-baru" },
    };
    await subscribeRoute.POST(jsonRequest("/api/push/subscribe", "POST", body));
    await subscribeRoute.POST(jsonRequest("/api/push/subscribe", "POST", body));

    const count = await db.pushSubscription.count({ where: { endpoint: ENDPOINT } });
    expect(count).toBe(1);
    const row = await db.pushSubscription.findUnique({ where: { endpoint: ENDPOINT } });
    expect(row?.p256dh).toBe("kunci-baru");
  });

  it("menolak payload tidak valid", async () => {
    const user = await createUser();
    setAuthUser(user);

    const res = await subscribeRoute.POST(
      jsonRequest("/api/push/subscribe", "POST", { endpoint: "bukan-url" })
    );
    expect(res.status).toBe(400);
  });

  it("menghapus langganan", async () => {
    const user = await createUser();
    setAuthUser(user);
    await subscribeRoute.POST(
      jsonRequest("/api/push/subscribe", "POST", {
        endpoint: ENDPOINT,
        keys: { p256dh: "kunci", auth: "auth" },
      })
    );

    const res = await subscribeRoute.DELETE(
      jsonRequest("/api/push/subscribe", "DELETE", { endpoint: ENDPOINT })
    );
    expect(res.status).toBe(200);
    expect(await db.pushSubscription.count({ where: { endpoint: ENDPOINT } })).toBe(0);
  });
});
