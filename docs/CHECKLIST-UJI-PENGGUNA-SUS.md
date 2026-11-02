# Checklist Operasional Uji Pengguna & SUS — SOBAT ADI

Dokumen pelengkap `Panduan-Uji-Pengguna-SUS.docx`. Fokus: **5–8 peserta**, satu sesi ±75 menit, kuota AI **$5** dengan model berbayar murah.

- Aplikasi: `https://astoria-learning-capstone-project.vercel.app`
- Fitur terbaru yang diuji: unggah PDF/TXT, batas 20.000 karakter, CRUD tim/proyek/tugas, back button, cache/hapus dokumen, jam & timer Mentor AI, badge sisa kuota AI.
- Prinsip: yang diuji aplikasi, bukan peserta. Tidak ada jawaban benar/salah.

---

## 1. Ringkasan sesi

| Item | Keterangan |
|---|---|
| Peserta | 5–8 mahasiswa, minimal 2 orang untuk tugas tim |
| Durasi | 60–75 menit per peserta |
| Perangkat | Laptop + browser Chrome/Edge; jaringan stabil |
| AI | Model berbayar murah (`google/gemma-4-26b-a4b-it`), limit kredit $5 |
| Biaya perkiraan | < $1 untuk 8 peserta |
| Instrumen | Skenario tugas, lembar observasi, SUS 10 pernyataan, consent |

---

## 2. Checklist pra-sesi (H-1 dan hari-H)

### A. Aplikasi & akun
- [ ] Buka production URL dan login dengan akun uji.
- [ ] Siapkan akun peserta P1–P8 (atau 2–3 akun bergiliran).
- [ ] Siapkan 1 akun admin terpisah untuk skenario T9.
- [ ] Pastikan minimal 2 akun bisa menguji fitur tim (owner + anggota).
- [ ] Uji login, logout, dan redirect tanpa error.
- [ ] Pastikan badge kuota AI muncul (`AI xxx/300`).

### B. AI & kuota
- [ ] Isi kredit **$5** di OpenRouter.
- [ ] Set `AI_MODEL=google/gemma-4-26b-a4b-it` (tanpa `:free`).
- [ ] Set `AI_FALLBACK_MODELS=qwen/qwen3.7-flash`.
- [ ] Set **spending limit $5**, auto-top-up **nonaktif**.
- [ ] Kirim 1 pertanyaan percobaan ke Mentor AI.
- [ ] Pastikan kuota aplikasi masih > 200/300 sebelum sesi.
- [ ] Siapkan rencana kontinjensi jika muncul 429.

### C. Data uji
- [ ] Siapkan 1–2 dokumen contoh **sebelum** sesi (jangan semua peserta upload).
- [ ] PDF ≤ 5 MB atau TXT ≤ 1 MB; isi ≤ 20.000 karakter.
- [ ] Pastikan dokumen sudah berstatus approved/pending dan muncul di daftar.
- [ ] Siapkan tim/proyek contoh agar peserta tidak memulai dari nol (opsional).
- [ ] Siapkan notifikasi/tenggat contoh untuk skenario analitik.

### D. Instrumen
- [ ] Lembar persetujuan (consent).
- [ ] Lembar observasi per peserta.
- [ ] Formulir SUS.
- [ ] Stopwatch/ponsel.
- [ ] Alat rekam layar/suara (hanya jika peserta setuju).
- [ ] Naskah pengarahan moderator.

### E. Etika
- [ ] Jelaskan data dicatat dengan kode peserta (P1, P2, …).
- [ ] Peserta boleh berhenti kapan saja.
- [ ] Jangan menampilkan nama/email peserta di laporan.
- [ ] Hapus akun dan dokumen uji setelah sesi selesai.

---

## 3. Peran dan pembagian tugas

| Peran | Tugas | Nama |
|---|---|---|
| Moderator | Membacakan skenario, menjaga netralitas, memberi bantuan minimal | |
| Observer/notulen | Mencatat keberhasilan, waktu, kesalahan, kutipan | |
| Tech support | Menyiapkan akun, dokumen, AI, dan mengatasi error | |
| Timekeeper | Menjaga durasi tiap tugas dan sesi | |

### Rotasi urutan tugas per peserta

Urutan dirotasi agar hasil tidak bias karena urutan. Tugas tim dikerjakan berpasangan.

| Peserta | Urutan tugas | Pasangan |
|---|---|---|
| P1 | T1 → T2 → T3 → T4 → T5 → T6 → T7 | P2 |
| P2 | T2 → T3 → T1 → T5 → T4 → T7 → T6 | P1 |
| P3 | T3 → T1 → T4 → T2 → T6 → T5 → T7 | P4 |
| P4 | T4 → T2 → T5 → T3 → T1 → T7 → T6 | P3 |
| P5 | T5 → T1 → T2 → T4 → T3 → T6 → T7 | P6 |
| P6 | T6 → T3 → T2 → T1 → T5 → T4 → T7 | P5 |
| P7 | T7 → T4 → T1 → T5 → T3 → T2 → T6 | P8 |
| P8 | T1 → T5 → T6 → T2 → T4 → T3 → T7 | P7 |

T9 (admin) hanya untuk peserta dengan akun admin atau didemonstrasikan moderator.

---

## 4. Skenario tugas (versi sistem sekarang)

| Kode | Skenario | Kriteria berhasil |
|---|---|---|
| **T1** | Daftar akun baru, login, lalu logout. | Berhasil masuk ke Beranda dan kembali ke halaman login setelah logout. |
| **T2** | Unggah modul PDF (≤ 5 MB) atau tempel teks (≤ 20.000 karakter). Periksa struktur dan status moderasi. | Dokumen tampil di daftar; struktur terbaca; status moderasi terlihat. |
| **T3** | Buka Mentor AI, pilih dokumen, ajukan 2 pertanyaan. Perhatikan jam kirim/jawab dan badge kuota. | Dua jawaban diterima; waktu kirim/jawab tampil; badge AI terbaca. |
| **T4** | Buat kuis, jawab minimal 2 soal, lalu lihat skor/XP. | Soal tampil (maks. 5); skor/feedback/XP muncul. |
| **T5** | Buat tim, tambahkan pasangan sebagai anggota, ubah nama tim. | Tim tampil; anggota muncul; nama tim berubah. |
| **T6** | Buat proyek, buat 2 tugas, isi tenggat, lalu pindahkan satu tugas ke Selesai. | Proyek dan tugas tampil; kartu berpindah kolom; XP tim berubah. |
| **T7** | Dari Kolaborasi, klik **Beranda**; lalu buka kembali Collab dan klik **Tim & Proyek** dari papan proyek. | Kembali ke halaman yang benar tanpa error; waktu respons wajar (< 3 detik). |
| **T8** | Setelah unggah, klik **Unggah dokumen lain**, lalu unggah dokumen uji kedua dan klik **Hapus dokumen**. | Form bersih; dokumen kedua terhapus; daftar dokumen diperbarui. |
| **T9** | Admin: buka tab Admin, moderasi satu dokumen, lihat ringkasan dan insight AI. | Status dokumen berubah; ringkasan tampil; insight/fallback tampil. |

Catatan T2/T8: jangan menguji file > 5 MB atau > 20.000 karakter kecuali ingin menguji pesan validasi; jika ya, catat sebagai skenario terpisah, bukan kegagalan.

---

## 5. Lembar observasi per peserta

| Tugas | Berhasil (Ya/Bantuan/Tidak) | Waktu (mnt:dtk) | Jumlah salah | Catatan |
|---|---|---|---|---|
| T1 | | | | |
| T2 | | | | |
| T3 | | | | |
| T4 | | | | |
| T5 | | | | |
| T6 | | | | |
| T7 | | | | |
| T8 | | | | |
| T9 | | | | |

Kode peserta: `P__`  
Tanggal/sesi: `__________`  
Perangkat/browser: `__________`

---

## 6. Kuesioner SUS

Skala 1 = sangat tidak setuju, 5 = sangat setuju.

| No | Pernyataan | 1 | 2 | 3 | 4 | 5 |
|---|---|---|---|---|---|---|
| 1 | Saya pikir saya akan sering menggunakan sistem ini. | O | O | O | O | O |
| 2 | Saya merasa sistem ini terlalu rumit tanpa perlu. | O | O | O | O | O |
| 3 | Saya pikir sistem ini mudah digunakan. | O | O | O | O | O |
| 4 | Saya pikir saya membutuhkan bantuan orang yang ahli teknis untuk dapat menggunakan sistem ini. | O | O | O | O | O |
| 5 | Saya menemukan bahwa berbagai fungsi dalam sistem ini terintegrasi dengan baik. | O | O | O | O | O |
| 6 | Saya pikir terlalu banyak ketidakkonsistenan dalam sistem ini. | O | O | O | O | O |
| 7 | Saya membayangkan bahwa kebanyakan orang akan belajar menggunakan sistem ini dengan cepat. | O | O | O | O | O |
| 8 | Saya merasa sistem ini sangat canggung untuk digunakan. | O | O | O | O | O |
| 9 | Saya merasa percaya diri saat menggunakan sistem ini. | O | O | O | O | O |
| 10 | Saya perlu belajar banyak hal sebelum bisa mulai menggunakan sistem ini. | O | O | O | O | O |

### Skor SUS

- Ganjil: `jawaban - 1`
- Genap: `5 - jawaban`
- Jumlahkan 10 kontribusi (0–40), lalu `× 2,5`.

| Skor rata-rata | Tafsiran |
|---|---|
| < 51 | Buruk; perlu perbaikan besar |
| 51–68 | Di bawah rata-rata; perlu perbaikan |
| 68 | Rata-rata industri |
| 68–80 | Baik; dapat diterima |
| > 80 | Sangat baik |

---

## 7. Kuota AI saat uji pengguna

| Skenario | Perkiraan request AI | Model gratis 50/hari | $5 model berbayar |
|---|---:|---|---|
| 8 peserta × 15 request | ±120 | Tidak cukup | Cukup |
| 8 peserta × 20 request | ±160 | Tidak cukup | Cukup |
| 2 sesi × 8 peserta | ±320 | Tidak cukup | Masih cukup |

- Pre-upload dokumen sebelum sesi untuk mengurangi request.
- Jangan menjalankan lebih dari 2–3 peserta paralel.
- Jika muncul **429**: catat waktunya, tunggu 60 detik, lanjutkan tugas non-AI. Jangan anggap kegagalan peserta.
- Jika AI gagal total: gunakan fallback unggah dokumen dan lanjutkan skenario T5–T8.

---

## 8. Setelah sesi

- [ ] Hitung tingkat keberhasilan per tugas.
- [ ] Hitung rata-rata waktu dan jumlah kesalahan.
- [ ] Hitung skor SUS tiap peserta dan rata-rata.
- [ ] Kelompokkan masalah dan beri tingkat keparahan.
- [ ] Simpan kutipan penting untuk laporan.
- [ ] Hapus akun, tim, proyek, dan dokumen uji.
- [ ] Cabut akses peserta ke akun uji.

### Tingkat keparahan temuan

| Tingkat | Kriteria |
|---|---|
| Tinggi | Peserta gagal/menyerah atau salah memahami alur utama |
| Sedang | Berhasil tetapi dengan bantuan/kesalahan berulang |
| Rendah | Mengganggu kecil, tidak menghambat tugas |

---

## Lampiran A — Naskah pengarahan moderator

> “Terima kasih sudah membantu. Kami menguji aplikasi, bukan menguji Anda; tidak ada jawaban benar atau salah. Silakan bersuara selama memakai aplikasi (think aloud). Saya tidak akan membantu kecuali Anda benar-benar buntu. Anda boleh berhenti kapan saja. Data dicatat dengan kode peserta dan hanya dipakai untuk evaluasi tugas.”

## Lampiran B — Pertanyaan wawancara singkat

1. Bagian mana yang paling mudah?
2. Bagian mana yang paling membingungkan?
3. Apakah informasi waktu jawaban dan sisa kuota AI membantu?
4. Jika boleh memperbaiki satu hal, apa itu?

## Lampiran C — Consent singkat

> Saya bersedia mengikuti uji kegunaan SOBAT ADI. Saya memahami bahwa yang diuji adalah aplikasi, saya boleh berhenti kapan saja, dan data saya dicatat dengan kode peserta untuk keperluan evaluasi tugas kuliah.

Nama/kode: `__________`  
Tanda tangan: `__________`  
Tanggal: `__________`
