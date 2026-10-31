# SOBAT ADI — Rencana Implementasi (diperbarui)

Menggantikan rencana awal "Astoria Collab". Poin 1-3 sudah dikerjakan; dokumen ini mencakup keadaan sekarang dan **Poin 4: kesiapan produksi + deploy ke Vercel**.

## 0. Status Poin 4 (diperbarui)

| Fase | Status | Catatan |
|---|---|---|
| A. Bersihkan rahasia | **Selesai** (sisi kode) | `.env` dan `db/custom.db` dilepas dari git, `.gitignore` diperbaiki (termasuk `prisma/db/`), `.env.example` dibuat, `.z-ai-config.example` dikembalikan ke placeholder. **Tersisa untukmu:** rotasi API key OpenRouter dan `NEXTAUTH_SECRET` baru untuk produksi |
| B. PostgreSQL (Supabase) | **Menunggu URL Supabase** | Keputusan: Supabase. Skema masih SQLite sampai URL tersedia |
| C. AI lewat env var | **Selesai, diuji** | `AI_BASE_URL` + `AI_API_KEY`, atau file `.z-ai-config`; SDK dilepas dari dependensi |
| D. Data per pengguna | **Selesai, diuji** | Semua rute halaman utama memakai sesi; akun demo tidak lagi dipakai di API |
| E. Keamanan | **Sebagian** | Selesai: login wajib di 15 rute (401), admin-only (403), kepemilikan dokumen, uji non-anggota. **Belum:** rate limit, validasi zod |
| F. Konfigurasi deploy | Belum | Setelah Fase B |

Catatan temuan saat pengerjaan: Prisma menghitung jalur SQLite relatif dari folder `prisma/`, jadi database lokal yang sebenarnya ada di `prisma/db/custom.db` (bukan `db/custom.db`).

## 1. Keadaan sekarang (ringkas)

Sudah selesai dan diuji: auth NextAuth (Credentials), Collab (tim, proyek, Kanban, tenggat, Mentor AI per tugas, leaderboard, activity feed, notifikasi, badge tim, dashboard analitik), RAG hibrida (embedding + kata kunci), fallback model AI, rebranding SOBAT ADI, dua dokumen panduan.

Perubahan dari rencana awal yang **tetap berlaku**: tambah anggota lewat nama (email ditunda), TeamBadge ada, penyedia AI = OpenRouter, nama = SOBAT ADI.

## 2. Keputusan yang diganti

| Rencana awal | Sekarang | Alasan |
|---|---|---|
| Tetap Prisma + SQLite | **Prisma + PostgreSQL** (disarankan Supabase, sesuai stack awal) | Vercel punya filesystem read-only; SQLite tidak bisa menulis |
| Fitur halaman utama memakai satu akun demo bersama | **Data per pengguna** (dokumen, chat, kuis, XP, lencana) | Di produksi semua pengunjung akan berbagi data yang sama |
| Panel admin tanpa pemeriksaan peran | **Hanya role `admin`** | Rute `/api/admin/*` terbuka untuk siapa saja |
| AI lewat file `.z-ai-config` + SDK | **Env var `AI_BASE_URL`, `AI_API_KEY`**, panggil `fetch` langsung | SDK hanya membaca file dan konstruktornya `private`; file itu tidak ikut ter-deploy |

## 3. Masalah yang menghalangi deploy Vercel (sudah diverifikasi di kode)

1. **SQLite** (`file:./db/custom.db`): tidak bisa ditulis di Vercel.
2. **`.z-ai-config`**: di-gitignore dan dibaca dari disk; di Vercel tidak ada, semua fitur AI gagal.
3. **`.env` dan `db/custom.db` ter-track di git** (ikut commit awal). `.env` sekarang berisi `NEXTAUTH_SECRET` dan sudah berstatus modified; `custom.db` berisi hash password dan data pengguna. Repo remote: `github.com/luthfiardiansyah01/Astoria-Learning-Capstone-Project`.
4. **`.z-ai-config.example` berisi API key OpenRouter asli** dan belum di-ignore. Satu `git add .` akan mempublikasikannya.
5. **Batas waktu fungsi**: model gratis butuh 5-20 detik. Belum ada `maxDuration` di rute AI. Batas Vercel tergantung paket; **periksa di dashboard** sebelum mengandalkan angka tertentu.
6. **Koneksi database serverless**: Prisma perlu URL pooled (+ `directUrl` untuk migrasi) dan `prisma generate` saat build.
7. `build` memakai `cp -r` dan `output: "standalone"`; tidak perlu di Vercel.
8. `typescript.ignoreBuildErrors: true` menyembunyikan galat tipe.

## 4. Langkah kerja

### Fase A — Bersihkan rahasia (WAJIB, sebelum push apa pun)
- `git rm --cached .env db/custom.db`; tambahkan `db/*.db` ke `.gitignore`.
- Kembalikan `.z-ai-config.example` ke placeholder.
- **Rotasi API key OpenRouter** (key lama pernah tertulis di berkas yang bisa ter-commit) dan buat `NEXTAUTH_SECRET` baru untuk produksi.
- Buat `.env.example` berisi nama variabel tanpa nilai.
- Periksa riwayat git: bila `.env` lama berisi rahasia, bersihkan atau anggap bocor.

### Fase B — Database PostgreSQL
- `schema.prisma`: `provider = "postgresql"`, `url = env("DATABASE_URL")`, `directUrl = env("DIRECT_URL")`.
- Buat proyek Supabase (atau Neon); pakai URL pooled untuk `DATABASE_URL`, URL langsung untuk `DIRECT_URL`.
- Mulai riwayat migrasi sungguhan (`prisma migrate dev`, lalu `migrate deploy` di produksi), bukan `db push`.
- `db.ts`: matikan `log: ['query']` di produksi.
- Seed produksi: **tanpa akun demo berpassword publik**; admin dibuat sekali lewat env var.
- Data lokal tidak dimigrasi (hanya data uji).

### Fase C — AI di Vercel
- `ai.ts`: baca `AI_BASE_URL` + `AI_API_KEY` dari env (fallback ke `.z-ai-config` untuk lokal); panggil `fetch` ke `/chat/completions` dan `/embeddings` langsung. Logika retry, rotasi model, cache, dan `embedTexts` tetap.
- Tambah `export const maxDuration` pada rute AI (`chat`, `quiz/*`, `documents`, `greeting`, `admin/analytics`, `collab/tasks/*/mentor`).

### Fase D — Data per pengguna (halaman utama)
- Tambah relasi pemilik pada dokumen, chat, dan percobaan kuis sudah ada via `uploaderId`/`userId`; ganti `getOrCreateUsers()` di `chat`, `documents`, `greeting`, `profile`, `quiz/submit` dengan `getCurrentUser()` dan filter berdasarkan pengguna.
- Dokumen: milik pengguna atau berstatus `approved` (bisa dipakai bersama).
- Halaman utama mengharuskan login (redirect ke `/login`); hapus fallback akun demo.

### Fase E — Keamanan dasar
- Rute `/api/admin/*` dan tampilan Admin: wajib `role === "admin"`.
- Batasi laju (rate limit) pada `/api/auth/register`, login, dan rute AI agar kuota gratis tidak dihabiskan orang lain. Perlu penyimpanan bersama (mis. Upstash Redis) karena memori fungsi serverless tidak dibagi.
- Validasi input dengan zod pada rute yang menerima body (zod sudah terpasang).
- Uji akses: bukan anggota tim, bukan admin, dan belum login harus mendapat 401/403 di semua rute Collab dan admin.

### Fase F — Konfigurasi dan deploy
- Hapus `output: "standalone"` dan `ignoreBuildErrors`; perbaiki galat tipe yang muncul.
- `package.json`: `"postinstall": "prisma generate"`, `"build": "prisma migrate deploy && next build"`.
- Env var di Vercel: `DATABASE_URL`, `DIRECT_URL`, `NEXTAUTH_URL` (domain Vercel), `NEXTAUTH_SECRET`, `AI_BASE_URL`, `AI_API_KEY`, `AI_MODEL`, `AI_FALLBACK_MODELS`, `AI_EMBED_MODEL`.
- Hubungkan repo GitHub ke Vercel, deploy, jalankan migrasi.
- Perbarui `Buku-Manual-Aplikasi.docx` (bab instalasi/konfigurasi/akun demo) agar sesuai produksi.

## 5. Verifikasi

1. Lokal dengan Postgres: `bun run dev`, alur lengkap (daftar, buat tim, Kanban, Mentor AI, kuis, unggah, analitik, notifikasi).
2. Dua akun berbeda: data halaman utama tidak saling terlihat; admin saja yang melihat panel admin.
3. Akses tanpa login dan non-anggota: 401/403.
4. `next build` lokal tanpa `ignoreBuildErrors` lolos.
5. Di Vercel (preview): daftar akun, Mentor AI menjawab dalam batas waktu, unggah dokumen membuat embedding, login bertahan (cookie/`NEXTAUTH_URL`).
6. Pastikan tidak ada rahasia di `git log -p` dan di repo.

## 6. Risiko yang tersisa
- Model AI gratis: lambat dan kena batas pemakaian; tidak ada jaminan untuk banyak pengguna.
- Paket gratis Vercel/Supabase punya batas (fungsi, koneksi, penyimpanan); cek batas terbaru sebelum demo.
- Keamanan di atas adalah dasar, bukan audit.
