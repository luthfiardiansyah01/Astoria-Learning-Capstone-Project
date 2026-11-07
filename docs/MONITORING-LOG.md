# Log Monitoring & Tahapan SOBAT ADI

Dokumen ini adalah catatan operasional berjalan. Setiap tahap (P0, P1, P2, …)
wajib menambahkan entri di bagian **Log Tahapan** agar keputusan, bukti
verifikasi, dan sisa risiko tidak hilang.

- **Produksi:** https://astoria-learning-capstone-project.vercel.app
- **Repo:** `luthfiardiansyah01/Astoria-Learning-Capstone-Project`
- **Runbook terkait:** `docs/OPERATIONS-RUNBOOK.md`
- **Terakhir diperbarui:** 7 November 2026

## Status ringkas

| Fase | Status | Commit terakhir | Catatan |
|---|---|---|---|
| P0 | Selesai | `322c481` | Rotasi DB, rate limit, admin, Midtrans internal |
| P1 | Selesai | `179b2d6` | Semua item P1 aktif dan terverifikasi di produksi |
| P2 | Selesai | `17fe563` | Limit atomik, URL/quiz state, toast, XP, a11y, performa |

## Checklist monitoring

### Harian

| Item | Cara cek | Ambang normal | Tindakan bila anomali |
|---|---|---|---|
| Error runtime & 5xx | `vercel logs --environment production --since 30m --non-interactive` | 0 error, 0 respons 5xx | Cek request/path, rollback bila perlu |
| Autentikasi database | Log yang sama; cari `28P01`, `P1001`, `P1017`, `password authentication failed` | Tidak ada | Cek `DATABASE_URL`/`DIRECT_URL` di Vercel, verifikasi password DB |
| Login Free | Login `free.seed@moedatrace.com` atau akun uji | HTTP 200, plan `free` | Cek Upstash/fail-closed, lalu DB |
| Login admin | Login `admin@ut.ac.id` | HTTP 200, role `admin` | Gunakan admin cadangan; jangan kunci diri sendiri |
| Upstash | Ping REST atau lihat key `sobadi:rl:*` | `PONG`, key bertambah saat login | Jika down, putuskan `RATE_LIMIT_FAIL_CLOSED=false` sementara |
| Webhook Midtrans | `GET /api/billing/webhook/midtrans` | HTTP 200 | Cek dashboard Midtrans dan log webhook |
| Rate limit 429 | Log/analytics; pantau lonjakan | Wajar hanya saat abuse | Naikkan batas per IP bila jaringan kampus bersama |

### Mingguan

| Item | Cara cek | Tindakan |
|---|---|---|
| Channel Midtrans | Dashboard Midtrans → business review/channel | Bila aktif, uji transaksi kecil end-to-end |
| Pembayaran pending | Admin → pembayaran | Cocokkan order ID + nominal; jangan tandai `paid` tanpa bukti |
| Admin legacy | Login/daftar admin | Hapus/nonaktifkan `admin@sobat-adi.id` setelah admin aktif aman |
| Backup Supabase | Dashboard → Database → Backups | Pastikan backup terbaru tersedia |
| Dependency/security | `bun audit` atau Dependabot | Perbarui patch kritis |

### Bulanan

| Item | Cara cek | Tindakan |
|---|---|---|
| Secret hygiene | `git grep` pola token; cek history | Rotasi token yang pernah terekspos |
| Supabase linter/RLS | Dashboard → Advisors | Tutup temuan baru |
| Kredensial admin | Password manager | Rotasi berkala; pastikan dua admin aktif |
| Akses Vercel/Supabase | Daftar member | Cabut akses yang tidak lagi diperlukan |

## Log tahapan

Tambahkan entri baru **di bagian paling bawah** setiap selesai satu tahap.
Jangan menulis password, token, atau isi `.env` di dokumen ini.

| Tanggal | Fase | Item | Status | Bukti/Catatan |
|---|---|---|---|---|
| 2026-11-07 | P0 | Rotasi password database | Selesai | 48 karakter; Vercel + lokal diperbarui; 19 user; login Free/admin 200; PAT dihapus |
| 2026-11-07 | P0 | Rate limit produksi | Selesai | Per-IP 60/15m; per akun 10/15m; fail-closed aktif; key Upstash terverifikasi |
| 2026-11-07 | P0 | Akun admin | Selesai | `admin@ut.ac.id` password kuat; login role `admin`; legacy admin dipertahankan |
| 2026-11-07 | P0 | Midtrans | Selesai (internal) | `configured=true`; alur manual teruji; channel menunggu business review |
| 2026-11-07 | P0 | Regresi & log | Selesai | Unit 143, integration 124, E2E 11; log 0 error/0 5xx; CI `322c481` success |
| 2026-11-07 | P0 | Sisa risiko | Terbuka | Admin legacy, fail-closed saat Upstash down, batas IP jaringan bersama, channel Midtrans |
| 2026-11-07 | P1 | Body limit & webhook | Selesai | Middleware 1 MB (webhook 256 KB); rate limit webhook 120/menit per IP |
| 2026-11-07 | P1 | Moderasi dokumen | Selesai | Moderasi seluruh teks; tidak ada auto-approve; dokumen baru `pending` |
| 2026-11-07 | P1 | Undangan tim | Selesai | Tabel `TeamInvite`; anggota baru harus menerima; email tidak diekspos |
| 2026-11-07 | P1 | Audit RLS | Selesai | Produksi: 18 tabel RLS aktif, 0 policy publik; `TeamInvite` RLS aktif |
| 2026-11-07 | P1 | Verifikasi email/CAPTCHA | Selesai | Aktif di produksi; CAPTCHA menolak tanpa token; verifikasi memberi trial 7 hari |
| 2026-11-07 | P1 | Regresi | Selesai | Unit 150, integration 133, E2E 12; build lulus |
| 2026-11-07 | P1 | Aktivasi produksi | Selesai | Resend terkirim; Turnstile aktif; akun baru Free sampai verifikasi; verifikasi memberi trial 7 hari |
| 2026-11-07 | P2 | Limit atomik | Selesai | Row lock untuk tim/proyek/tugas/anggota; test request paralel |
| 2026-11-07 | P2 | URL & sesi kuis | Selesai | View tersimpan di `?view=`; sesi kuis dipulihkan dari sessionStorage |
| 2026-11-07 | P2 | Konsistensi UI | Selesai | Satu sistem toast (Sonner); QueryState loading/error/empty/retry |
| 2026-11-07 | P2 | Integritas XP | Selesai | XP hanya percobaan pertama per soal |
| 2026-11-07 | P2 | Aksesibilitas | Selesai | Keyboard Kanban, dropdown status, aria-live chat/kuis |
| 2026-11-07 | P2 | Performa | Selesai | Greeting tanpa AI, badge ganda dihapus, dependency tak terpakai dihapus |
| 2026-11-07 | P2 | Regresi | Selesai | Unit 150, integration 139, E2E 13 |
| 2026-11-07 | P2 | Bugfix | Selesai | XP paralel soal sama tidak ganda; sesi kuis dipisah per pengguna |
| 2026-11-07 | P1 | Bugfix undangan | Selesai | Owner bisa membatalkan undangan pending; label aktivitas/notifikasi diperbaiki |

### Detail entri P0 — 7 November 2026

**Perubahan**
- Rotasi password database melalui Supabase Management API.
- Update `DATABASE_URL` dan `DIRECT_URL` di Vercel Production, `.env`, `.env.supabase`.
- Tambah rate limit login per IP dan validasi header IP.
- Aktifkan `RATE_LIMIT_FAIL_CLOSED=true`.
- Rotasi password `admin@ut.ac.id`; token PAT dan backup rotasi dihapus.
- Dokumentasi operasional dibuat di `docs/OPERATIONS-RUNBOOK.md`.

**Verifikasi**
- Query DB dengan password baru: 19 user.
- Login Free: HTTP 200, plan `free`.
- Login admin: HTTP 200, role `admin`.
- Log produksi 30 menit: 0 error, 0 respons 5xx, tidak ada `28P01`.
- Unit 143 / integration 124 / E2E 11 lulus.
- CI `322c481` sukses; deployment Production Ready.

**Sisa risiko**
- `admin@sobat-adi.id` masih aktif (legacy).
- Fail-closed memblokir login/AI bila Upstash down.
- Batas 60 login/15 menit per IP bisa terasa ketat di NAT kampus.
- Channel pembayaran Midtrans belum aktif; alur manual tetap tersedia.
- Layanan eksternal di luar repo yang masih memakai password DB lama perlu diperbarui.

### Detail entri P1 — 7 November 2026

**Perubahan**
- Middleware batas body: 1 MB untuk API umum, 256 KB untuk webhook.
- Rate limit webhook Midtrans/Xendit: 120 request/menit per IP, fail-open bila Redis down.
- Moderasi dokumen memakai seluruh teks (bukan 2.000 karakter pertama), prompt
  moderator diberi aturan anti-injection.
- Dokumen unggahan baru selalu `pending`; AI hanya boleh menolak otomatis,
  persetujuan selalu oleh admin.
- Model `TeamInvite` + endpoint undangan; anggota baru harus menerima undangan
  sebelum mengakses tim. Email target tidak lagi dikembalikan API.
- Honeypot pada form registrasi sebagai mitigasi bot interim.

**Verifikasi**
- Unit 146 / integration 129 / E2E 12 lulus.
- Build produksi + middleware lulus.
- RLS test DB: 18 tabel aktif, 0 policy publik, `TeamInvite` RLS aktif.
- Migrasi `20261107010000_team_invite` diterapkan ke test DB dan produksi.
- Produksi: login Free `200`, `/collab` `200`, `GET /api/collab/invites` `200`,
  body 1,1 MB ditolak `413`, login admin `200`.
- Log produksi 20 menit: 0 error, 0 respons 5xx.
- CI `733a6a7` sukses; deployment Production Ready.

**Sisa risiko**
- Verifikasi email dan CAPTCHA belum aktif karena belum ada kredensial
  SMTP/Resend/Turnstile. Honeypot + rate limit hanya mitigasi sementara.
- Batas anggota tim masih memakai pola hitung-lalu-buat (race condition).
- Admin legacy `admin@sobat-adi.id` masih aktif.
- Channel pembayaran Midtrans tetap menunggu business review.

**Tindak lanjut**
- Sediakan `RESEND_API_KEY`/SMTP dan kunci Turnstile untuk P1 lanjutan.
- Atomickan batas anggota tim dan pertimbangkan undangan via email.

### Detail entri P1 lanjutan — verifikasi email & CAPTCHA (7 November 2026)

**Perubahan**
- Tambah `User.emailVerifiedAt` dan model `EmailVerificationToken` (hash SHA-256,
  berlaku 24 jam, sekali pakai).
- Registrasi dengan `EMAIL_VERIFICATION_ENABLED=true` membuat akun Free tanpa
  trial; trial 7 hari baru diberikan setelah email diverifikasi.
- Endpoint verifikasi, kirim ulang, halaman `/verify-email`, dan banner beranda.
- Cloudflare Turnstile pada form registrasi (aktif bila site/secret key diisi).
- `guardAi` menolak akun belum verifikasi; klaim trial manual juga ditolak.
- Pengguna lama di-backfill sebagai terverifikasi oleh migrasi.
- Panduan manual: `docs/EMAIL-VERIFICATION-SETUP.md`.

**Verifikasi**
- Unit 150 / integration 131 / E2E 12 lulus.
- Migrasi `20261107020000_email_verification` diterapkan ke test DB.
- Alur test: registrasi → token → verifikasi → trial 7 hari; akun belum
  verifikasi ditolak saat klaim trial dan AI.

**Status produksi**
- Aktif sejak 7 November 2026: `EMAIL_VERIFICATION_ENABLED=true`, kunci Resend
  dan Turnstile terpasang di Vercel Production.
- Resend berhasil mengirim email uji; Turnstile termuat di form registrasi.
- Uji produksi: registrasi dengan CAPTCHA berhasil, akun baru Free dan belum
  terverifikasi, banner verifikasi muncul, AI dan klaim trial manual ditolak
  `403 email_unverified`.
- Verifikasi produksi: endpoint `200`, trial 7 hari aktif, lalu akun uji dihapus.
- Produksi: migrasi ke-7 diterapkan, 19 tabel RLS aktif, `/verify-email` `200`,
  `/api/plan` sudah mengembalikan `emailVerified`.
- Panduan: `docs/EMAIL-VERIFICATION-SETUP.md`.

**Sisa risiko**
- Email deliverability bergantung pada verifikasi domain Resend (SPF/DKIM).
- CAPTCHA hanya aktif bila kedua kunci Turnstile terisi.

### Detail entri P2 — 7 November 2026

**Perubahan**
- Semua cek batas paket (tim, proyek, tugas, anggota) memakai transaksi +
  `SELECT ... FOR UPDATE` pada baris User/Team/Project, sehingga request paralel
  tidak bisa melewati batas. Urutan tugas juga atomik.
- View aktif disimpan di `?view=`; refresh, back/forward, dan deep-link bekerja.
  Sesi kuis (soal, jawaban, hasil) disimpan di sessionStorage dan dipulihkan.
- Toast disatukan ke Sonner; komponen `QueryState` dipakai untuk
  loading/error/empty + retry di halaman kolaborasi dan Kanban.
- XP kuis hanya diberikan pada percobaan pertama per soal; badge tetap idempoten.
- Kanban mendapat `KeyboardSensor`, kartu bisa dibuka dengan Enter, dan panel
  tugas punya dropdown status untuk pengguna keyboard.
- Chat memakai `role="log"` + `aria-live`; hasil kuis memakai `aria-live`.
- Greeting beranda tidak lagi memanggil AI/memotong kuota; badge plan/kuota
  duplikat di chat dihapus; `MotionConfig reducedMotion="user"` ditambahkan.
- Tujuh dependency tak terpakai dihapus; loading khusus auth/legal ditambahkan.

**Verifikasi**
- Unit 150 / integration 139 / E2E 13 lulus.
- Build produksi lulus.
- Test konkuren: dua request tim/tugas paralel menghasilkan satu 200 dan satu 403.
- Test konkuren kuis: dua submit paralel soal yang sama hanya menambah XP sekali.
- E2E memverifikasi `?view=mentor` bertahan setelah refresh dan hasil kuis
  bertahan setelah reload.

**Bugfix setelah audit P2**
- XP kuis kini dihitung di dalam transaksi dengan row lock User, sehingga dua
  submit paralel untuk soal yang sama tidak memberi XP ganda.
- Sesi kuis di sessionStorage dipisah per `userId` agar tidak terbawa antar akun
  di browser yang sama.

**Sisa risiko**
- Batas paket kini aman untuk request paralel, tetapi operasi lain yang tidak
  memakai row lock tetap mengikuti isolasi default PostgreSQL.
- Greeting kini lokal (tanpa AI); bila ingin sapaan AI lagi, tambahkan cache
  agar tidak memotong kuota.
- Beberapa komponen UI lama masih ada di repo meski dependency beratnya sudah
  dihapus; pembersihan lanjutan bisa dilakukan di P3.

## Template entri tahap berikutnya

Salin template ini ke bagian paling bawah **Log tahapan** dan isi:

```markdown
### YYYY-MM-DD — P1 — <judul>

**Perubahan**
- ...

**Verifikasi**
- ...

**Hasil**
- ...

**Sisa risiko**
- ...

**Tindak lanjut**
- ...
```

## Perintah bantu

```powershell
# Log produksi 30 menit terakhir
vercel logs --environment production --since 30m --non-interactive

# Health check
curl.exe -s -o NUL -w "%{http_code}" https://astoria-learning-capstone-project.vercel.app/login
curl.exe -s -o NUL -w "%{http_code}" https://astoria-learning-capstone-project.vercel.app/api/billing/webhook/midtrans

# Cek key rate limit di Upstash (token dibaca dari env, tidak dicetak)
# Gunakan script internal atau dashboard Upstash; jangan pernah mencetak token.
```

## Aturan penulisan log

1. Satu entri per tahap/perubahan besar; sertakan tanggal dan fase.
2. Tulis bukti yang dapat diverifikasi (status HTTP, jumlah test, commit hash).
3. Jangan menulis password, token, API key, atau isi `.env`.
4. Redaksi email pengguna bila perlu.
5. Jika ada rollback, catat penyebab dan hasilnya.
6. Perbarui **Status ringkas** setiap kali fase berubah.
