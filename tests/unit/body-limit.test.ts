import { describe, expect, it } from "vitest";
import {
  BODY_LIMIT_DEFAULT,
  BODY_LIMIT_WEBHOOK,
  bodyLimitForPath,
  exceedsBodyLimit,
  readLimitedText,
} from "@/lib/body-limit";

describe("body limit", () => {
  it("memakai batas lebih kecil untuk webhook", () => {
    expect(bodyLimitForPath("/api/billing/webhook/midtrans")).toBe(BODY_LIMIT_WEBHOOK);
    expect(bodyLimitForPath("/api/billing/webhook/xendit")).toBe(BODY_LIMIT_WEBHOOK);
    expect(bodyLimitForPath("/api/chat")).toBe(BODY_LIMIT_DEFAULT);
  });

  it("mendeteksi body melebihi batas", () => {
    expect(exceedsBodyLimit("/api/chat", String(BODY_LIMIT_DEFAULT + 1))).toBe(true);
    expect(exceedsBodyLimit("/api/chat", String(BODY_LIMIT_DEFAULT))).toBe(false);
    expect(exceedsBodyLimit("/api/billing/webhook/midtrans", String(BODY_LIMIT_WEBHOOK + 1))).toBe(true);
  });

  it("mengabaikan header kosong/tidak valid", () => {
    expect(exceedsBodyLimit("/api/chat", null)).toBe(false);
    expect(exceedsBodyLimit("/api/chat", "bukan-angka")).toBe(false);
    expect(exceedsBodyLimit("/api/chat", "-1")).toBe(false);
  });
});

function textRequest(body: string, headers?: Record<string, string>) {
  return new Request("http://localhost/api/test", { method: "POST", body, headers });
}

/** Body berupa stream agar tidak ada header Content-Length (kasus chunked). */
function streamRequest(text: string, chunkSize = 32) {
  const bytes = new TextEncoder().encode(text);
  const stream = new ReadableStream<Uint8Array>({
    start(controller) {
      for (let i = 0; i < bytes.length; i += chunkSize) {
        controller.enqueue(bytes.slice(i, i + chunkSize));
      }
      controller.close();
    },
  });
  return new Request("http://localhost/api/test", {
    method: "POST",
    body: stream,
    duplex: "half",
  } as RequestInit & { duplex: "half" });
}

describe("readLimitedText", () => {
  it("membaca body yang berada di bawah batas", async () => {
    const result = await readLimitedText(textRequest("halo dunia"), 100);
    expect(result).toEqual({ ok: true, text: "halo dunia" });
  });

  it("menerima body tepat sebesar batas", async () => {
    const text = "a".repeat(64);
    const result = await readLimitedText(streamRequest(text), 64);
    expect(result).toEqual({ ok: true, text });
  });

  it("menolak body chunked yang melewati batas tanpa Content-Length", async () => {
    const result = await readLimitedText(streamRequest("x".repeat(500), 16), 128);
    expect(result).toEqual({ ok: false, tooLarge: true });
  });

  it("menolak lebih awal bila Content-Length melebihi batas", async () => {
    const result = await readLimitedText(
      textRequest("kecil", { "content-length": "999999" }),
      128
    );
    expect(result).toEqual({ ok: false, tooLarge: true });
  });

  it("mengembalikan teks kosong untuk request tanpa body", async () => {
    const result = await readLimitedText(new Request("http://localhost/api/test"), 10);
    expect(result).toEqual({ ok: true, text: "" });
  });
});
