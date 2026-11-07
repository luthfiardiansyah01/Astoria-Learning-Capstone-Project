import { beforeEach, describe, expect, it, vi } from "vitest";
import { db } from "@/lib/db";
import { chatComplete, chatJSON } from "@/lib/ai";
import { FALLBACK_RESPONSES } from "@/lib/fallback";
import {
  createDocument,
  createUser,
  jsonRequest,
  params,
  resetDb,
  setAuthUser,
} from "./helpers";
import * as documentsRoute from "@/app/api/documents/route";
import * as documentDetailRoute from "@/app/api/documents/[id]/route";
import * as chatRoute from "@/app/api/chat/route";
import * as greetingRoute from "@/app/api/greeting/route";

const metadata = {
  judul_dokumen: "Modul Ekonomi",
  ringkasan: "Modul ini membahas permintaan dan penawaran.",
  topik_utama: ["ekonomi", "permintaan"],
  struktur: [{ bab: "Bab 1", judul: "Permintaan", subtopik: ["harga"] }],
  kata_kunci: ["ekonomi", "permintaan", "penawaran"],
  estimasi_tingkat_kesulitan: "Menengah",
  mata_kuliah_terkait: "Ekonomi",
};

const moderation = {
  layak: true,
  skor_kualitas: 85,
  alasan: "Materi relevan dan jelas.",
  tag_otomatis: ["ekonomi"],
  rekomendasi_admin: "Aktifkan langsung",
};

function mockDocAI() {
  vi.mocked(chatJSON).mockReset();
  vi.mocked(chatJSON)
    .mockResolvedValueOnce(metadata as never)
    .mockResolvedValueOnce(moderation as never);
}

beforeEach(async () => {
  await resetDb();
  setAuthUser(null);
  vi.mocked(chatComplete).mockReset();
  vi.mocked(chatComplete).mockResolvedValue("Jawaban mock dengan referensi Bab 1.");
  vi.mocked(chatJSON).mockReset();
  vi.mocked(chatJSON).mockResolvedValue({} as never);
});

describe("POST /api/documents", () => {
  it("menolak tanpa sesi", async () => {
    const res = await documentsRoute.POST(
      jsonRequest("/api/documents", "POST", { fileName: "a.txt", content: "Materi" })
    );
    expect(res.status).toBe(401);
  });

  it("menolak konten kosong", async () => {
    const user = await createUser();
    setAuthUser(user);
    const res = await documentsRoute.POST(
      jsonRequest("/api/documents", "POST", { fileName: "a.txt", content: " " })
    );
    expect(res.status).toBe(400);
  });

  it("menolak dokumen Free di atas 8.000 karakter", async () => {
    const user = await createUser({ plan: "free" });
    setAuthUser(user);
    const res = await documentsRoute.POST(
      jsonRequest("/api/documents", "POST", {
        fileName: "besar.txt",
        content: "a".repeat(9_000),
      })
    );
    const body = (await res.json()) as { code: string };
    expect(res.status).toBe(413);
    expect(body.code).toBe("doc_too_large");
  });

  it("menyimpan dokumen, chunk, metadata, dan moderasi", async () => {
    const user = await createUser({ plan: "premium", planExpiresAt: null });
    setAuthUser(user);
    mockDocAI();

    const res = await documentsRoute.POST(
      jsonRequest("/api/documents", "POST", {
        fileName: "modul.txt",
        content: "Ekonomi membahas permintaan dan penawaran pasar.",
      })
    );
    const body = (await res.json()) as {
      document: { id: string; status: string; metadata: { judul_dokumen: string }; chunkCount: number };
    };
    expect(res.status).toBe(200);
    expect(body.document.status).toBe("pending");
    expect(body.document.metadata.judul_dokumen).toBe("Modul Ekonomi");
    expect(body.document.chunkCount).toBeGreaterThan(0);

    const chunks = await db.chunk.count({ where: { documentId: body.document.id } });
    expect(chunks).toBe(body.document.chunkCount);
  });

  it("memakai fallback lokal bila AI metadata/moderasi gagal", async () => {
    const user = await createUser();
    setAuthUser(user);
    vi.mocked(chatJSON).mockReset();
    vi.mocked(chatJSON).mockRejectedValue(new Error("AI down"));

    const res = await documentsRoute.POST(
      jsonRequest("/api/documents", "POST", {
        fileName: "modul.txt",
        content: "Materi singkat tentang ekonomi dan permintaan pasar.",
      })
    );
    const body = (await res.json()) as { document: { metadata: object; aiWarnings: string[] } };
    expect(res.status).toBe(200);
    expect(body.document.metadata).toBeTruthy();
    expect(body.document.aiWarnings.length).toBeGreaterThan(0);
  });
});

describe("GET /api/documents", () => {
  it("hanya menampilkan dokumen milik sendiri atau yang approved", async () => {
    const owner = await createUser();
    const other = await createUser();
    const own = await createDocument(owner.id, { status: "pending", fileName: "milik.txt" });
    const approved = await createDocument(other.id, { status: "approved", fileName: "publik.txt" });
    await createDocument(other.id, { status: "pending", fileName: "rahasia.txt" });

    setAuthUser(owner);
    const res = await documentsRoute.GET();
    const body = (await res.json()) as { documents: { id: string; fileName: string }[] };
    const ids = body.documents.map((d) => d.id);
    expect(ids).toContain(own.id);
    expect(ids).toContain(approved.id);
    expect(ids).not.toContain(undefined);
    expect(body.documents.some((d) => d.fileName === "rahasia.txt")).toBe(false);
  });
});

describe("GET/DELETE /api/documents/[id]", () => {
  it("menolak dokumen pending milik pengguna lain", async () => {
    const owner = await createUser();
    const other = await createUser();
    const doc = await createDocument(owner.id, { status: "pending" });
    setAuthUser(other);

    const res = await documentDetailRoute.GET(
      jsonRequest(`/api/documents/${doc.id}`, "GET"),
      params({ id: doc.id })
    );
    expect(res.status).toBe(403);
  });

  it("mengizinkan dokumen approved dipakai pengguna lain", async () => {
    const owner = await createUser();
    const other = await createUser();
    const doc = await createDocument(owner.id, { status: "approved" });
    setAuthUser(other);

    const res = await documentDetailRoute.GET(
      jsonRequest(`/api/documents/${doc.id}`, "GET"),
      params({ id: doc.id })
    );
    expect(res.status).toBe(200);
  });

  it("menolak hapus dokumen milik orang lain", async () => {
    const owner = await createUser();
    const other = await createUser();
    const doc = await createDocument(owner.id);
    setAuthUser(other);

    const res = await documentDetailRoute.DELETE(
      jsonRequest(`/api/documents/${doc.id}`, "DELETE"),
      params({ id: doc.id })
    );
    expect(res.status).toBe(403);
  });

  it("mengizinkan pemilik menghapus dokumen", async () => {
    const owner = await createUser();
    const doc = await createDocument(owner.id);
    setAuthUser(owner);

    const res = await documentDetailRoute.DELETE(
      jsonRequest(`/api/documents/${doc.id}`, "DELETE"),
      params({ id: doc.id })
    );
    expect(res.status).toBe(200);
    expect(await db.document.count({ where: { id: doc.id } })).toBe(0);
  });
});

describe("POST /api/chat", () => {
  it("menolak tanpa sesi", async () => {
    const res = await chatRoute.POST(
      jsonRequest("/api/chat", "POST", { question: "Apa itu ekonomi?" })
    );
    expect(res.status).toBe(401);
  });

  it("mengembalikan fallback no_document tanpa dokumen", async () => {
    const user = await createUser();
    setAuthUser(user);
    const res = await chatRoute.POST(
      jsonRequest("/api/chat", "POST", { question: "Apa itu ekonomi?" })
    );
    const body = (await res.json()) as { fallback: string };
    expect(res.status).toBe(200);
    expect(body.fallback).toBe("no_document");
  });

  it("menolak dokumen pending milik pengguna lain", async () => {
    const owner = await createUser();
    const other = await createUser();
    const doc = await createDocument(owner.id, { status: "pending" });
    setAuthUser(other);
    const res = await chatRoute.POST(
      jsonRequest("/api/chat", "POST", { documentId: doc.id, question: "Apa itu ekonomi?" })
    );
    expect(res.status).toBe(403);
  });

  it("menjawab dengan RAG dan menyimpan riwayat", async () => {
    const user = await createUser();
    const doc = await createDocument(user.id, { status: "approved" });
    setAuthUser(user);

    const res = await chatRoute.POST(
      jsonRequest("/api/chat", "POST", { documentId: doc.id, question: "Apa itu permintaan?" })
    );
    const body = (await res.json()) as { reply: string };
    expect(res.status).toBe(200);
    expect(body.reply).toContain("Jawaban mock");
    expect(await db.chatMessage.count({ where: { userId: user.id, documentId: doc.id } })).toBe(2);
  });

  it("membatasi riwayat yang dikirim ke AI menjadi 6 pesan terakhir", async () => {
    const user = await createUser();
    const doc = await createDocument(user.id);
    await db.chatMessage.createMany({
      data: Array.from({ length: 12 }, (_, i) => ({
        userId: user.id,
        documentId: doc.id,
        role: i % 2 === 0 ? "user" : "assistant",
        content: `Pesan ${i}`,
      })),
    });
    setAuthUser(user);
    vi.mocked(chatComplete).mockClear();

    await chatRoute.POST(
      jsonRequest("/api/chat", "POST", { documentId: doc.id, question: "Pertanyaan baru" })
    );

    const messages = vi.mocked(chatComplete).mock.calls[0][0];
    // system + 6 riwayat + pertanyaan baru
    expect(messages).toHaveLength(8);
    expect(messages[0].role).toBe("system");
    expect(messages[messages.length - 1].content).toBe("Pertanyaan baru");
  });

  it("mengganti jawaban out-of-context dengan fallback", async () => {
    const user = await createUser();
    const doc = await createDocument(user.id);
    setAuthUser(user);
    vi.mocked(chatComplete).mockResolvedValueOnce("Informasi itu tidak tersedia dalam modul.");

    const res = await chatRoute.POST(
      jsonRequest("/api/chat", "POST", { documentId: doc.id, question: "Siapa presiden?" })
    );
    const body = (await res.json()) as { reply: string };
    expect(body.reply).toBe(FALLBACK_RESPONSES.out_of_context);
  });
});

describe("GET/DELETE /api/chat", () => {
  it("mengembalikan riwayat milik pengguna dan membersihkannya", async () => {
    const user = await createUser();
    const doc = await createDocument(user.id);
    await db.chatMessage.create({
      data: { userId: user.id, documentId: doc.id, role: "user", content: "Halo" },
    });
    setAuthUser(user);

    const getRes = await chatRoute.GET(
      jsonRequest(`/api/chat?documentId=${doc.id}`, "GET")
    );
    const getBody = (await getRes.json()) as { messages: { content: string }[] };
    expect(getBody.messages).toHaveLength(1);

    const delRes = await chatRoute.DELETE(
      jsonRequest(`/api/chat?documentId=${doc.id}`, "DELETE")
    );
    expect(delRes.status).toBe(200);
    expect(await db.chatMessage.count({ where: { userId: user.id } })).toBe(0);
  });
});

describe("GET /api/greeting", () => {
  it("menolak tanpa sesi", async () => {
    const res = await greetingRoute.GET();
    expect(res.status).toBe(401);
  });

  it("mengembalikan sapaan untuk pengguna login", async () => {
    const user = await createUser({ name: "Sapaan Test", streakDays: 3 });
    setAuthUser(user);
    const res = await greetingRoute.GET();
    const body = (await res.json()) as { greeting: string; stats: { nama: string } };
    expect(res.status).toBe(200);
    expect(body.greeting.length).toBeGreaterThan(0);
    expect(body.stats.nama).toBe("Sapaan Test");
  });
});
