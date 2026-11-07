# Panduan Deploy ke Vercel

Dokumen ini menjelaskan cara menaikkan SOBAT ADI ke produksi memakai Vercel (aplikasi Next.js) + Supabase (PostgreSQL) + Upstash (rate limit).

---

## 1. Gambaran arsitektur produksi

| Bagian | Layanan | Catatan |
|---|---|---|
| Aplikasi Next.js | Vercel | Paket Hobby, `maxDuration = 60` detik untuk rute AI |
| Database | Supabase PostgreSQL | Satu proyek dipakai sebagai produksi |
| Rate limit | Upstash Redis (REST) | Wajib di produksi; `RATE_LIMIT_FAIL_CLOSED=true` |
| Model AI | OpenRouter (OpenAI-compatible) | Butuh `AI_API_KEY` |
| Email verifikasi | Resend | `RESEND_API_KEY` + `EMAIL_FROM` |
| CAPTCHA | Cloudflare Turnstile | Site key publik + secret key server |

Alur koneksi database:

- `DATABASE_URL` → pooler transaksi Supabase (port **6543**, `?pgbouncer=true&connection_limit=1`) dipakai aplikasi saat runtime.
- `DIRECT_URL` → pooler sesi Supabase (port **5432**) dipakai Prisma untuk migrasi.

Keduanya wajib diisi. Tanpa `DIRECT_URL`, `prisma migrate deploy` akan gagal.

---

## 2. Yang perlu disiapkan

1. Akun Vercel yang terhubung ke repository GitHub proyek ini.
2. Proyek Supabase produksi (sudah ada) beserta connection string-nya.
3. Database Upstash Redis (region terdekat, mis. `ap-southeast-1`).
4. API key OpenRouter yang masih aktif.
5. Nilai `NEXTAUTH_SECRET` baru khusus produksi (jangan pakai nilai dari `.env` lokal).

---

## 3. Variabel environment di Vercel

Buka **Project → Settings → Environment Variables**, lalu isi untuk environment **Production** (dan **Preview** bila ingin preview berfungsi penuh).

| Nama | Wajib | Contoh / cara mendapat | Catatan |
|---|---|---|---|
| `DATABASE_URL` | ya | Supabase → Connect → Transaction pooler (port 6543) | Tambahkan `?pgbouncer=true&connection_limit=1` |
| `DIRECT_URL` | ya | Supabase → Connect → Session pooler (port 5432) | Dipakai migrasi |
| `NEXTAUTH_SECRET` | ya | `bun -e "console.log(require('crypto').randomBytes(32).toString('base64'))"` | **Buat baru**, jangan sama dengan lokal |
| `NEXTAUTH_URL` | ya | `https://domain-produksi` | Harus persis domain final, tanpa garis miring di akhir |
| `AI_BASE_URL` | ya | `https://openrouter.ai/api/v1` | |
| `AI_API_KEY` | ya | Dashboard OpenRouter | Jangan pernah ditampilkan/di-commit |
| `AI_MODEL` | ya | mis. `cohere/north-mini-code:free` | Model utama |
| `AI_FALLBACK_MODELS` | tidak | daftar dipisah koma | Cadangan bila model utama gagal |
| `AI_EMBED_MODEL` | tidak | mis. `nvidia/nemotron-3-embed-1b:free` | Untuk pencarian semantik |
| `UPSTASH_REDIS_REST_URL` | ya (produksi) | Dashboard Upstash → REST API | Tanpa ini rate limit jatuh ke memori per-instance |
| `UPSTASH_REDIS_REST_TOKEN` | ya (produksi) | Dashboard Upstash → REST API | Rahasia |
| `RATE_LIMIT_FAIL_CLOSED` | ya (produksi) | `true` | Login/register/checkout/AI/upload ditolak bila Redis tidak tersedia |
| `EMAIL_VERIFICATION_ENABLED` | ya | `true` | Wajibkan verifikasi email sebelum trial/AI |
| `RESEND_API_KEY` | ya jika verifikasi email aktif | Dashboard Resend | Rahasia, permission sending |
| `EMAIL_FROM` | ya jika verifikasi email aktif | `SOBAT ADI <no-reply@moedatrace.com>` | Domain harus terverifikasi di Resend |
| `NEXT_PUBLIC_TURNSTILE_SITE_KEY` | ya jika CAPTCHA aktif | Dashboard Turnstile | Site key publik |
| `TURNSTILE_SECRET_KEY` | ya jika CAPTCHA aktif | Dashboard Turnstile | Rahasia server |

Catatan:
- `SEED_ADMIN_*` **tidak** perlu diisi di Vercel. Itu hanya untuk menjalankan `seed:prod` sekali dari mesin lokal.
- Jangan menaruh `.env` atau `.env.supabase` di repository. Sudah masuk `.gitignore`.
- Untuk Preview Deployment, `NEXTAUTH_URL` harus disesuaikan dengan domain preview, atau preview dibiarkan memakai database terpisah.

---

## 4. Langkah deploy pertama

1. **Migration ke Supabase** (dari mesin lokal, memakai `.env.supabase`):

   ```bash
   bun run db:prod:status   # pastikan koneksi & status migrasi
   bun run db:prod:deploy   # terapkan migrasi
   ```

2. **Import repository ke Vercel**
   - Framework preset: Next.js (terdeteksi otomatis).
   - Install command: biarkan default. `bun.lock` ada, jadi Vercel memakai Bun dan menjalankan `postinstall: prisma generate`.
   - **Build command sudah diatur lewat `vercel.json`** menjadi `bun run build:prod`, jadi tidak perlu diubah manual di dashboard.
   - Region: pilih yang dekat dengan Supabase (mis. `Singapore (sin1)`), karena database berada di `ap-northeast-1`.

3. **Isi environment variables** (bagian 3), lalu deploy.

4. **Seed admin produksi** (sekali saja, dari lokal):

   ```bash
   # isi SEED_ADMIN_* di .env.supabase sementara
   bun scripts/db-prod.ts seed
   # lalu hapus SEED_ADMIN_* dari .env.supabase
   ```

5. **Set domain** di Vercel, lalu perbarui `NEXTAUTH_URL` agar sama persis dengan domain tersebut. Redeploy setelah mengubah env.

---

## 5. Batas paket Vercel Hobby

- Durasi fungsi maksimal **60 detik** → semua rute AI sudah diberi `export const maxDuration = 60`.
- Bila model gratis lambat (> 60 detik), permintaan akan gagal. Solusi: pakai model lebih cepat atau naik ke paket Pro (batas lebih besar).
- Rate limit tetap disimpan di Upstash, jadi tidak terpengaruh cold start atau jumlah instance.

---

## 6. Checklist verifikasi setelah deploy

Jalankan berurutan terhadap domain produksi:

1. `GET /login` → 200.
2. Login admin produksi → masuk ke dashboard admin.
3. `GET /api/admin/analytics` tanpa login → **401**.
4. Login sebagai mahasiswa → `GET /api/admin/analytics` → **403**.
5. `POST /api/chat` dengan body kosong (setelah login) → **400**.
6. Registrasi baru → wajib CAPTCHA; tanpa token → **400**; akun baru belum
   terverifikasi sampai email diklik.
7. Buka tautan verifikasi → trial Premium 7 hari aktif; sebelum verifikasi AI
   dan klaim trial manual → **403** `email_unverified`.
8. Unggah satu dokumen kecil → status awal `pending`; pemilik tetap bisa
   memakainya, pengguna lain tidak.
9. Generate kuis → submit jawaban → XP bertambah sekali per soal.
10. Buat tim → undang anggota → anggota harus menerima undangan sebelum akses.
11. Register 6 kali dari IP yang sama → permintaan ke-6 **429** dengan header
    `Retry-After`; login dari satu IP juga dibatasi.
12. Kirim body >1 MB ke API umum → **413**; webhook >256 KB → **413**.
13. Cek header `Content-Security-Policy-Report-Only`, HSTS, `nosniff`,
    `X-Frame-Options: DENY`.
14. Cek dashboard Upstash: key `sobadi:rl:login-ip:*` dan `sobadi:rl:login:*`
    bertambah.

Untuk pengujian cepat sebagian besar alur di atas, `scripts/smoke.ps1` bisa diarahkan ke domain produksi dengan mengubah variabel `$Base` di bagian atas skrip (hati-hati: skrip ini membuat user dan tim uji, jadi bersihkan setelahnya).

---

## 7. Operasional

| Kebutuhan | Perintah |
|---|---|
| Cek koneksi & status migrasi produksi | `bun run db:prod:status` |
| Terapkan migrasi produksi | `bun run db:prod:deploy` |
| Cek isi tabel utama | `bun scripts/db-prod.ts check` |
| Seed admin pertama | `bun scripts/db-prod.ts seed` |

- Migrasi baru dibuat lokal dengan `bun x prisma migrate dev --name <nama>`, lalu di-commit. Migrasi otomatis diterapkan saat deployment **Production** di Vercel (`bun run build:prod` → `prisma migrate deploy`), atau manual lewat `bun run db:prod:deploy`.

**Cara kerja build di Vercel** (`vercel.json` → `bun run build:prod` → `scripts/vercel-build.ts`):

| Kondisi | `VERCEL_ENV` | Migrasi | Build |
|---|---|---|---|
| Deployment Production | `production` | dijalankan (`DIRECT_URL` wajib ada) | ya |
| Deployment Preview | `preview` | dilewati | ya |
| Build lokal (`bun run build`) | kosong | tidak terlibat | `next build` saja |

Jika `DIRECT_URL` kosong saat Production, build sengaja **gagal lebih awal** dengan pesan jelas, agar tidak ada aplikasi baru yang berjalan di atas skema lama.
- Jangan pernah menjalankan `prisma migrate reset` terhadap database produksi.

---

## 8. Keamanan

- `.env`, `.env.supabase`, dan `.z-ai-config` tidak boleh masuk repository.
- Rotasi `NEXTAUTH_SECRET` akan membuat semua sesi lama logout — lakukan bila curiga bocor.
- Rotasi API key OpenRouter dan token Upstash secara berkala.
- Bila sebuah rahasia pernah ter-commit, mengubah nilainya di Vercel **tidak** menghapusnya dari riwayat Git; rotasi nilai tersebut adalah wajib.
- CSP saat ini dikirim sebagai **`Content-Security-Policy-Report-Only`**. Setelah laporan pelanggaran bersih, ubah menjadi header enforced.
- Per 8 November 2026: **8 migrasi**, **19 tabel RLS**, **7 CHECK constraint**, dan **5 index baru P3** sudah diterapkan di produksi.
