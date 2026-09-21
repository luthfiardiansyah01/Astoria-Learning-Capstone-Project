// src/lib/fallback.ts
// Seksi 7 — Error Handling & Fallback Prompts (dari spesifikasi)

export const FALLBACK_RESPONSES = {
  // Ketika dokumen belum diunggah
  no_document:
    "Halo! Untuk mulai belajar, upload dulu modul atau materi kuliah kamu ya. " +
    "Klik tombol '📤 Unggah Dokumen' di atas. Saya siap membantu setelah itu! 😊",

  // Ketika pertanyaan di luar konteks dokumen
  out_of_context:
    "Pertanyaan ini sepertinya tidak ada dalam modul yang kamu unggah. " +
    "Coba cek di modul lain, atau tanyakan langsung ke tutor kamu ya!",

  // Ketika API error / timeout
  api_error:
    "Mentor AI sedang istirahat sebentar 😅. " +
    "Coba lagi dalam beberapa detik. Jika masalah berlanjut, refresh halaman.",

  // Ketika konten tidak layak dideteksi
  inappropriate:
    "Hmm, saya tidak bisa membantu dengan pertanyaan itu. " +
    "Yuk fokus ke materi kuliah — ada yang mau ditanyakan dari modul kamu?",

  // Ketika dokumen terlalu besar
  doc_too_large:
    "Dokumen ini terlalu besar untuk diproses sekaligus. " +
    "Coba unggah per bab atau potong menjadi file yang lebih kecil (maks 50.000 karakter).",
} as const;

// Deteksi out-of-context dari respons GLM
export function isOutOfContext(reply: string): boolean {
  const markers = [
    "tidak tersedia dalam modul",
    "tidak ada dalam dokumen",
    "saya tidak menemukan",
    "di luar cakupan",
  ];
  return markers.some((m) => reply.toLowerCase().includes(m));
}

// Pre-processing input mahasiswa (Seksi 3.3)
export function preprocessUserInput(text: string): string {
  text = text.trim();
  if (text.length < 3) throw new Error("Pertanyaan terlalu pendek — minimal 3 karakter ya!");
  if (text.length > 800) text = text.slice(0, 800) + "...";
  return text;
}
