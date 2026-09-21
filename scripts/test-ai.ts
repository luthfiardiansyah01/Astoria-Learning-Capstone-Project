// Test cepat wrapper AI: pastikan parameter temperature/top_p diterima SDK
import { chatComplete, chatJSON } from "../src/lib/ai";

async function main() {
  console.log("Tes 1: chatComplete dengan params user_mentor...");
  const reply = await chatComplete(
    [
      { role: "system", content: "Kamu asisten uji coba. Jawab satu kalimat pendek." },
      { role: "user", content: "Sebutkan satu manfaat belajar jarak jauh." },
    ],
    { max_tokens: 1024, temperature: 0.4, top_p: 0.85 }
  );
  console.log("OK →", reply.slice(0, 120));

  console.log("\nTes 2: chatJSON...");
  const json = await chatJSON<{ ok: boolean }>([
    { role: "system", content: 'Balas HANYA JSON: {"ok": true}' },
    { role: "user", content: "uji" },
  ]);
  console.log("OK →", JSON.stringify(json));
}

main().catch((e) => {
  console.error("GAGAL:", e.message);
  process.exit(1);
});
