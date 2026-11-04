// Mock server AI untuk E2E: meniru endpoint OpenAI-compatible.
// Tidak memakai kuota dan memberi respons deterministik.
import { createServer, type IncomingMessage, type ServerResponse } from "node:http";

const PORT = Number(process.env.MOCK_AI_PORT ?? 4010);

const docMetadata = {
  judul_dokumen: "Modul E2E Upload",
  ringkasan: "Modul E2E membahas permintaan, penawaran, dan harga pasar.",
  topik_utama: ["permintaan", "penawaran", "harga"],
  struktur: [{ bab: "Bab 1", judul: "Permintaan dan Penawaran", subtopik: ["harga", "pasar"] }],
  kata_kunci: ["permintaan", "penawaran", "harga", "pasar"],
  estimasi_tingkat_kesulitan: "Menengah",
  mata_kuliah_terkait: "Ekonomi",
};

const moderation = {
  layak: true,
  skor_kualitas: 92,
  alasan: "Materi relevan, jelas, dan layak digunakan.",
  tag_otomatis: ["ekonomi", "permintaan"],
  rekomendasi_admin: "Aktifkan langsung",
};

const quiz = {
  soal: [
    { soal: "Apa itu permintaan?", kunci: "Keinginan membeli barang pada harga tertentu.", tingkat: "Dasar" },
    { soal: "Apa itu penawaran?", kunci: "Jumlah barang yang ditawarkan penjual.", tingkat: "Menengah" },
    { soal: "Apa hukum permintaan?", kunci: "Harga naik maka permintaan turun.", tingkat: "Lanjut" },
    { soal: "Apa fungsi harga?", kunci: "Menyeimbangkan permintaan dan penawaran.", tingkat: "Menengah" },
    { soal: "Apa itu pasar?", kunci: "Tempat bertemunya penjual dan pembeli.", tingkat: "Dasar" },
  ],
};

const evaluation = {
  skor: 100,
  xp_diperoleh: 20,
  badge_baru: "Pemberani",
  feedback: "Jawabanmu tepat dan jelas.",
  koreksi: "Tambahkan contoh agar makin kuat.",
  level_naik: false,
};

function chatContent(system: string): string {
  if (system.includes("TUGAS EKSTRAKSI DOKUMEN")) return JSON.stringify(docMetadata);
  if (system.includes("PERAN ADMIN")) return JSON.stringify(moderation);
  if (system.includes("EVALUATOR GAMIFIKASI ASTORIA")) return JSON.stringify(evaluation);
  if (system.includes("GENERATOR KUIS ASTORIA")) return JSON.stringify(quiz);
  if (system.includes("ANALISIS DATA PLATFORM")) {
    return "1. Ringkasan performa: pengguna aktif dan dokumen bertumbuh.\n2. Dokumen populer: Modul E2E Ekonomi.\n3. Kualitas kuis: baik.\n4. Rekomendasi: tinjau dokumen pending.";
  }
  if (system.includes("SAPAAN MENTOR PROAKTIF")) {
    return "Selamat pagi, E2E Student! Siap belajar hari ini?";
  }
  if (system.toLowerCase().includes("pendamping tim")) {
    return "Saran mentor untuk tugas ini: bagi pekerjaan menjadi langkah kecil.\n\n**Referensi: Bab 1**";
  }
  return "**Penjelasan**\nPermintaan adalah keinginan membeli barang pada harga tertentu.\n\n**Poin Kunci**\n- Harga naik, permintaan turun.\n\n**Referensi: Bab 1**";
}

async function readJson(req: IncomingMessage): Promise<Record<string, unknown>> {
  let raw = "";
  for await (const chunk of req) raw += chunk;
  return raw ? (JSON.parse(raw) as Record<string, unknown>) : {};
}

function send(res: ServerResponse, status: number, body: unknown) {
  res.writeHead(status, { "Content-Type": "application/json" });
  res.end(JSON.stringify(body));
}

const server = createServer(async (req, res) => {
  const url = new URL(req.url ?? "/", `http://127.0.0.1:${PORT}`);
  if (url.pathname === "/health") {
    res.writeHead(200, { "Content-Type": "text/plain" });
    res.end("ok");
    return;
  }

  if (url.pathname.endsWith("/chat/completions")) {
    const body = (await readJson(req)) as { messages?: { role: string; content: string }[] };
    const system = body.messages?.find((m) => m.role === "system")?.content ?? "";
    send(res, 200, {
      choices: [{ message: { role: "assistant", content: chatContent(system) } }],
    });
    return;
  }

  if (url.pathname.endsWith("/embeddings")) {
    const body = (await readJson(req)) as { input?: string | string[] };
    const inputs = Array.isArray(body.input) ? body.input : [body.input ?? ""];
    send(res, 200, {
      data: inputs.map((_, index) => ({
        index,
        embedding: Array.from({ length: 8 }, (_, i) => (i === index % 8 ? 1 : 0.1)),
      })),
    });
    return;
  }

  res.writeHead(404);
  res.end("not found");
});

server.listen(PORT, "127.0.0.1", () => {
  console.log(`[mock-ai] listening on http://127.0.0.1:${PORT}`);
});
