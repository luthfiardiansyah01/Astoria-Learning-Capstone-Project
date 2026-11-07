import { afterEach, describe, expect, it, vi } from "vitest";
import { turnstileConfigured, verifyTurnstile } from "@/lib/turnstile";

const saved = {
  secret: process.env.TURNSTILE_SECRET_KEY,
  site: process.env.NEXT_PUBLIC_TURNSTILE_SITE_KEY,
};

afterEach(() => {
  if (saved.secret === undefined) delete process.env.TURNSTILE_SECRET_KEY;
  else process.env.TURNSTILE_SECRET_KEY = saved.secret;
  if (saved.site === undefined) delete process.env.NEXT_PUBLIC_TURNSTILE_SITE_KEY;
  else process.env.NEXT_PUBLIC_TURNSTILE_SITE_KEY = saved.site;
  vi.unstubAllGlobals();
});

function configure() {
  process.env.TURNSTILE_SECRET_KEY = "test-secret";
  process.env.NEXT_PUBLIC_TURNSTILE_SITE_KEY = "test-site";
}

describe("Turnstile", () => {
  it("melewati verifikasi bila kunci belum diisi", async () => {
    delete process.env.TURNSTILE_SECRET_KEY;
    delete process.env.NEXT_PUBLIC_TURNSTILE_SITE_KEY;
    expect(turnstileConfigured()).toBe(false);
    await expect(verifyTurnstile(undefined, "127.0.0.1")).resolves.toEqual({ ok: true });
  });

  it("mewajibkan token bila CAPTCHA aktif", async () => {
    configure();
    expect(turnstileConfigured()).toBe(true);
    const result = await verifyTurnstile(undefined, "127.0.0.1");
    expect(result.ok).toBe(false);
  });

  it("menerima token yang valid", async () => {
    configure();
    const fetchMock = vi.fn(async () => new Response(JSON.stringify({ success: true }), { status: 200 }));
    vi.stubGlobal("fetch", fetchMock);
    await expect(verifyTurnstile("token-valid", "127.0.0.1")).resolves.toEqual({ ok: true });
    expect(fetchMock).toHaveBeenCalledOnce();
  });

  it("menolak token yang tidak valid", async () => {
    configure();
    vi.stubGlobal(
      "fetch",
      vi.fn(async () => new Response(JSON.stringify({ success: false }), { status: 200 }))
    );
    const result = await verifyTurnstile("token-palsu", "127.0.0.1");
    expect(result.ok).toBe(false);
  });
});
