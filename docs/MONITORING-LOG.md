# Log Monitoring & Tahapan SOBAT ADI

Dokumen ini adalah catatan operasional berjalan. Setiap tahap (P0, P1, P2, …)
wajib menambahkan entri di bagian **Log Tahapan** agar keputusan, bukti
verifikasi, dan sisa risiko tidak hilang.

- **Produksi:** https://astoria-learning-capstone-project.vercel.app
- **Repo:** `luthfiardiansyah01/Astoria-Learning-Capstone-Project`
- **Runbook terkait:** `docs/OPERATIONS-RUNBOOK.md`
- **Terakhir diperbarui:** 23 November 2026, setelah validasi roadmap dan pembaruan dokumen

## Status ringkas

| Fase | Status | Commit terakhir | Catatan |
|---|---|---|---|
| P0 | Selesai | `322c481` | Rotasi DB, rate limit, admin, Midtrans internal |
| P1 | Selesai | `4764de7` | Body limit, moderasi, undangan, verifikasi email/CAPTCHA aktif |
| P2 | Selesai | `6fc1afe` | Limit atomik, URL/quiz state, toast, XP, a11y, performa |
| P3 | Selesai | `c1e96a2` | Index/CHECK, cleanup UI/deps, CSP report-only, docs sanitized, orphan team |
| P4 | Selesai dengan catatan | `714a5e3` | Akun, reset password, kuota, sesi; monitoring belum penuh |
| P5 | Selesai dengan catatan | `714a5e3` | Skala, pgvector, audit log; uji beban lokal |
| P6 | Sebagian | `714a5e3` | Push, pengaturan, sesi, kuota, aksesibilitas; backlog keamanan tersisa |

## Status produksi saat ini

| Pemeriksaan | Kondisi terakhir |
|---|---|
| Deployment | Production **Ready** (deploy terakhir 20 Nov 2026) |
| Commit kode | `714a5e3` (batas sesi 12 jam) |
| Region aplikasi | `hnd1` (Tokyo), sama dengan database `ap-northeast-1` |
| Migrasi database | **18/18** diterapkan |
| Tabel `public` | **23**; RLS aktif pada **22**, `PushSubscription` belum |
| Policy RLS publik | **0** |
| CHECK constraint | **7** terpasang |
| Index baru P3 | **5** terpasang |
| Verifikasi email + CAPTCHA | **Aktif** (`EMAIL_VERIFICATION_ENABLED=true`) |
| Env pembayaran | `PAYMENT_PROVIDER`, `MIDTRANS_SERVER_KEY`, `MIDTRANS_CLIENT_KEY`, `MIDTRANS_IS_PRODUCTION` terpasang |
| Metode pembayaran | **Ditahan** (16 Nov 2026): kanal Midtrans belum disetujui, rekening manual belum diisi, `PAYMENT_MANUAL_ONLY=false` |
| Tim orphan | `Anim Team` **dihapus** (backup di temp) |
| Test | **171 unit**, **180 integration**, **28 E2E** (23 Nov 2026) |
| Cakupan | **79,43%** statement, **68,40%** branch |
| Dependensi kritis | Next **16.4.6**, sharp **0.35.5**; override lodash 4.18.1, postcss 8.5.33, nanoid 3.3.20, source-map-js 1.2.2 |
| Advisory runtime | **0** pada paket runtime utama; sisa temuan hanya rantai perkakas dev/build |
| Log produksi terakhir | **0 error, 0 respons 5xx** |
| CSP | **Enforced** sejak 18 November 2026; masih memuat `unsafe-inline` dan `unsafe-eval` |
| Halaman publik | `/login`, `/register`, `/produk`, `/verify-email`, legal -> **200** |
| Webhook Midtrans | `GET /api/billing/webhook/midtrans` -> **200** |
| Audit log admin | Tabel dan API siap; **0 baris** saat validasi 23 Nov |
| Token penyedia AI | Belum dicatat; laporan masih estimasi |


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
| 2026-11-07 | P1 | Bugfix undangan | Selesai | Owner bisa membatalkan undangan pending; label aktivitas/notifikasi diperbaiki |
| 2026-11-07 | P2 | Limit atomik | Selesai | Row lock untuk tim/proyek/tugas/anggota; test request paralel |
| 2026-11-07 | P2 | URL & sesi kuis | Selesai | View tersimpan di `?view=`; sesi kuis dipulihkan dari sessionStorage |
| 2026-11-07 | P2 | Konsistensi UI | Selesai | Satu sistem toast (Sonner); QueryState loading/error/empty/retry |
| 2026-11-07 | P2 | Integritas XP | Selesai | XP hanya percobaan pertama per soal |
| 2026-11-07 | P2 | Aksesibilitas | Selesai | Keyboard Kanban, dropdown status, aria-live chat/kuis |
| 2026-11-07 | P2 | Performa | Selesai | Greeting tanpa AI, badge ganda dihapus, dependency tak terpakai dihapus |
| 2026-11-07 | P2 | Regresi | Selesai | Unit 150, integration 139, E2E 13 |
| 2026-11-07 | P2 | Bugfix | Selesai | XP/badge paralel aman; sesi kuis per pengguna |
| 2026-11-07 | P3 | Schema hardening | Selesai | Index komposit, unique urutan tugas, CHECK status/role/plan, Payment restrict |
| 2026-11-07 | P3 | Cleanup UI/dependency | Selesai | 23 komponen UI tak terpakai + 23 dependency dihapus |
| 2026-11-07 | P3 | CSP & deployment | Selesai | CSP report-only, port proxy Caddy dihapus, metadata auth |
| 2026-11-07 | P3 | Sanitasi dokumen | Selesai | Kredensial demo di 2 file .docx diganti placeholder |
| 2026-11-07 | P3 | Data orphan | Selesai | `Anim Team` (1 proyek/1 task) dihapus; backup JSON tersimpan di temp |
| 2026-11-07 | P3 | Regresi | Selesai | Unit 150, integration 139, E2E 13 |
| 2026-11-08 | Docs | Audit & sinkronisasi dokumentasi | Selesai | Indeks docs, pembayaran, deploy, database, freemium, runbook, onboarding Midtrans |
| 2026-11-10 | Midtrans | Halaman produk publik | Selesai | `/produk` menampilkan produk, harga, fitur, alur bayar, legal, kontak |
| 2026-11-10 | Midtrans | Checklist Business Supporting Document | Selesai | `MIDTRANS-BUSINESS-DOCS.md` untuk 4 metode pembayaran |
| 2026-11-10 | Midtrans | Status proyek kampus & template surat | Selesai | Jalur entitas kampus/perorangan + template surat institusi |
| 2026-11-13 | Docs | Pemetaan user & role | Selesai | `USER-ROLE-MAPPING.md`: role, plan, tim, kepemilikan data, enforcement |
| 2026-11-14 | Docs | Tech stack format skripsi | Selesai | `TECH-STACK-SKRIPSI.md` + `.docx`: arsitektur, 7 tabel, justifikasi, metrik 15.071 baris kode |
| 2026-11-16 | Docs | Sinkronisasi dokumen teknis | Selesai | Region `hnd1`, env pembayaran, runbook rotasi admin, snapshot user 16 Nov, status freemium; unit 150 lulus |
| 2026-11-16 | Docs | SOP aktivasi Premium manual | Selesai | Jalur B utama (konfirmasi `Payment`) + Jalur A cadangan; bukti transaksi 14 Nov |
| 2026-11-16 | Ops | Verifikasi produksi | Selesai | 5 halaman 200, webhook 200, 8 migrasi, 19/19 RLS, 7 CHECK, 5 index, header keamanan lengkap |
| 2026-11-16 | Deploy | Halaman privasi & info penyelenggara live | Selesai | Commit `c7050c2`/`adc2d9d`; `/legal/kebijakan-privasi` 200; `/produk` memuat info penyelenggara + tautan privasi |
| 2026-11-16 | Ops | Indikator mode sandbox | Selesai | `sandbox` di `/api/billing/config`, badge di dialog paket & panel admin, skrip `billing-status.ts` |
| 2026-11-16 | Ops | Mode transfer manual | Selesai | `PAYMENT_MANUAL_ONLY`; pesanan `provider=manual` tanpa gateway, instruksi rekening, reuse 24 jam; tes integrasi |
| 2026-11-16 | Payment | Konfigurasi metode pembayaran **ditahan** | Ditunda | Midtrans production terpasang, kanal belum disetujui; rekening manual belum diisi; fitur transfer manual tersedia tetapi tidak diaktifkan |
| 2026-11-18 | Fix | Stabilitas & keamanan deploy | Selesai | Next 16.4.6, sharp 0.35.5, override dependensi rentan; batas body chunked; bcrypt 12; guard seed; tautan legal |
| 2026-11-18 | Perf | Baseline performa terukur | Selesai | `PERFORMANCE-BASELINE.md` + 4 skrip di `scripts/perf/`; 3 hotspot: documents 1,01 MB/198 ms, collab analytics 89 ms, server 31,6 MB |
| 2026-11-18 | Perf | Perf-1 optimasi dokumen & analitik | Selesai | `/api/documents` 198→11 ms (1,01 MB→10 KB); admin analytics 44→10 ms; traced files 391→12 |
| 2026-11-18 | Perf | Perf-2 analitik kolaborasi & payload proyek | Selesai | Collab analytics 6 ms warm (p95 9); project detail 390→176 KB; cache header statis |
| 2026-11-18 | P4 | Kesiapan publik | Selesai | Reset password, ekspor/hapus akun, kuitansi email, refund+alasan, consent S&K, CSP enforced, rotasi kredensial admin |
| 2026-11-18 | P5 | Skala & produk | Selesai | Kanban per-kolom (390→44,6 KB), cache analitik persisten, bundle 700→609 KB, email undangan + cron, audit log, pgvector 2048+HNSW (backfill 225), load test 667 RPS |

## Detail Fase P0 - 7 November 2026

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

## Detail Fase P1 - 7 November 2026

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

**Sisa risiko (saat P1 awal)**
- Verifikasi email dan CAPTCHA saat itu belum aktif; kemudian diaktifkan -
  lihat bagian **Detail entri P1 lanjutan**.
- Batas anggota tim saat itu masih hitung-lalu-buat; kemudian dibuat atomik di P2.
- Admin legacy `admin@sobat-adi.id` masih aktif.
- Channel pembayaran Midtrans tetap menunggu business review.

**Tindak lanjut**
- Sediakan `RESEND_API_KEY`/SMTP dan kunci Turnstile untuk P1 lanjutan.
- Atomickan batas anggota tim dan pertimbangkan undangan via email.

## Detail Fase P1 - Verifikasi Email & CAPTCHA (7 November 2026)

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
- Email deliverability tetap dipantau (SPF/DKIM/DMARC).
- Resend dan Turnstile adalah dependensi eksternal; outage dapat menunda
  registrasi/verifikasi.

## Detail Fase P2 - 7 November 2026

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
- Upsert badge juga dipindah ke transaksi yang sama untuk mencegah konflik
  `P2002` saat dua submit paralel.
- Sesi kuis di sessionStorage dipisah per `userId` agar tidak terbawa antar akun
  di browser yang sama.

**Sisa risiko**
- Batas paket kini aman untuk request paralel, tetapi operasi lain yang tidak
  memakai row lock tetap mengikuti isolasi default PostgreSQL.
- Greeting kini lokal (tanpa AI); bila ingin sapaan AI lagi, tambahkan cache
  agar tidak memotong kuota.
- Komponen UI lama dan dependency tak terpakai sudah dibersihkan di P3.

## Detail Fase P3 - 7 November 2026

**Perubahan**
- Migrasi `20261107030000_p3_constraints_indexes`:
  - index komposit Payment, QuizAttempt, Document,
  - unique `(projectId, status, order)` pada Task setelah renumber,
  - CHECK untuk role/plan/status,
  - FK Payment `ON DELETE RESTRICT` agar riwayat pembayaran tidak hilang.
- Kanban memakai `max(order)+1` saat pindah kolom; P2002 urutan mengembalikan 409.
- 23 komponen UI tak terpakai dan 23 dependency dihapus.
- CSP `Report-Only` ditambahkan; port proxy arbitrer Caddy dihapus.
- Metadata halaman login/register ditambahkan.
- Kredensial demo di `Buku-Manual-Aplikasi.docx` dan
  `Ringkasan-Sesi-SOBAT-ADI.docx` diganti placeholder.
- Tim orphan `Anim Team` (1 proyek, 1 task, tanpa anggota) dihapus; backup JSON
  disimpan di `%TEMP%\opencode\orphan-anim-team-backup.json`.

**Verifikasi**
- Unit 150 / integration 139 / E2E 13 lulus.
- Build produksi lulus.
- Migrasi diterapkan ke test DB dan produksi (8/8).
- Audit data: 0 nilai status/role/plan tidak valid; 0 duplikat urutan tugas.
- Produksi: 7 CHECK constraint dan 5 index baru terpasang; 19 tabel RLS aktif.
- `Anim Team` sudah tidak ada; `CSP Report-Only`, HSTS, `nosniff`, `DENY` terkirim.
- `/login`, `/register`, `/verify-email` 200; log produksi 0 error/0 5xx.
- CI `c1e96a2` sukses.

**Sisa risiko**
- CSP masih `Report-Only`; ubah menjadi enforced setelah laporan pelanggaran bersih.
- `Payment` sekarang `RESTRICT`; penghapusan user dengan riwayat pembayaran harus
  melalui proses arsip/soft-delete.
- Backup tim orphan hanya di temp; hapus setelah yakin tidak diperlukan.

## Detail Fase Dokumentasi - 8 November 2026

**Perubahan**
- Tambah `docs/README.md` sebagai indeks seluruh dokumentasi.
- Tambah `docs/MIDTRANS-ONBOARDING.md` (tanpa kredensial) untuk status review
  Midtrans.
- Perbarui `PAYMENT-SETUP.md`: status Midtrans production/in review, alur
  refund/cancel, status terminal, dan onboarding.
- Perbarui `DEPLOY-VERCEL.md`: env email/CAPTCHA/fail-closed, checklist
  verifikasi baru, 8 migrasi, 19 tabel RLS, CSP report-only.
- Perbarui `DATABASE-SECURITY.md`: 19 tabel, `TeamInvite`,
  `EmailVerificationToken`, CHECK/index P3, Payment restrict.
- Perbarui `FREEMIUM.md`: sapaan beranda tidak lagi memakai kuota AI.
- Perbarui `OPERATIONS-RUNBOOK.md` dan `CHECKLIST-UJI-PENGGUNA-SUS.md` untuk
  verifikasi email/CAPTCHA/undangan dan artefak Midtrans.

**Verifikasi**
- Tidak ada perubahan kode aplikasi pada audit dokumentasi ini.
- `docs/README.md` menjadi pintu masuk dokumentasi.
- Artefak Midtrans berisi akun dummy tetap di luar repo.

## Detail Fase Dokumentasi - 14 & 16 November 2026

**Perubahan**

- Tambah `docs/TECH-STACK-SKRIPSI.md` dan `docs/Tech-Stack-SOBAT-ADI-Skripsi.docx`:
  arsitektur sistem, 7 tabel teknologi, justifikasi pemilihan, pemetaan ke 10
  kebutuhan fungsional, metrik implementasi, dan batasan penelitian.
- `docs/DEPLOY-VERCEL.md`:
  - koreksi region: `vercel.json` memakai **`hnd1`** (Tokyo) dan database berada
    di `ap-northeast-1`, bukan `sin1`;
  - tabel env production dilengkapi variabel pembayaran, URL publik, kontak, dan
    `LOG_LEVEL`;
  - checklist verifikasi ditambah `/produk`, halaman legal, `/api/billing/config`
    (401), webhook (200), dan `403` non-admin;
  - tambah bagian riwayat verifikasi.
- `docs/OPERATIONS-RUNBOOK.md`:
  - status kredensial admin diperjelas (password demo, hash di database yang
    berlaku, `.env.supabase` hanya untuk seeding);
  - tambah prosedur **rotasi password admin** (bcrypt cost 12 + verifikasi login);
  - tambah bagian **pemeriksaan cepat produksi** beserta hasil normalnya;
  - **SOP aktivasi Premium manual**: Jalur B (konfirmasi transaksi) sebagai alur
    utama, Jalur A (aktivasi langsung) sebagai cadangan, plus aturan
    pembatalan/refund dan penyimpanan bukti.
- `docs/USER-ROLE-MAPPING.md`:
  - snapshot produksi diperbarui ke 16 November 2026;
  - dipisahkan **plan tersimpan** vs **plan efektif** (15 user masih
    `plan=premium` tetapi sudah kedaluwarsa dan efektif Free);
  - tambah query untuk memperbarui snapshot.
- `docs/FREEMIUM.md`:
  - status pembayaran diperbarui: kredensial Midtrans sudah terpasang, kanal
    masih menunggu review;
  - klaim "belum ada verifikasi email" dihapus karena sudah aktif sejak 7 Nov;
  - langkah uji registrasi/trial disesuaikan dengan alur verifikasi email.
- `docs/PAYMENT-SETUP.md`: status produksi diperbarui ke 16 November 2026
  (variabel Midtrans terpasang, kanal masih review) dan ditambah ringkasan dua
  jalur aktivasi manual.
- `docs/DATABASE-SECURITY.md`: verifikasi RLS diperbarui ke 16 November 2026.
- `docs/RENCANA-IMPLEMENTASI.md`: diberi penanda **arsip** agar status lama
  ("menunggu URL Supabase") tidak disalahartikan sebagai kondisi sekarang.
- **Website publik**: halaman `/legal/kebijakan-privasi` (13 bagian), blok
  **Informasi Penyelenggara** di `/produk`, dan tautan privasi di footer
  aplikasi serta seluruh halaman legal.
- **Mode sandbox**: `billingConfig()` mengekspos status `sandbox`, dialog paket
  dan panel admin menampilkan penanda, dan `scripts/billing-status.ts` membantu
  memastikan environment tidak memproses uang nyata.
- **Mode transfer manual**: `PAYMENT_MANUAL_ONLY=true` membuat checkout tanpa
  memanggil gateway. Pesanan tetap tercatat (`provider=manual`, status
  `pending`), dialog menampilkan nominal, `orderId`, dan rekening tujuan, lalu
  admin mengonfirmasi lewat panel. Pesanan dipakai ulang dalam 24 jam agar tidak
  ada tagihan ganda.
- **Keputusan 16 November 2026: metode pembayaran ditahan.** Tidak ada
  konfigurasi rekening baru dan `PAYMENT_MANUAL_ONLY` tetap `false` di produksi.
  Fitur transfer manual sudah ada dan teruji, tetapi belum diaktifkan sampai
  entitas/rekening diputuskan.

**Verifikasi**

- `bun run test:unit` → **150 lulus** (10 berkas, ±0,4 detik).
- Produksi: `/login`, `/register`, `/produk`, `/verify-email`,
  `/legal/syarat-ketentuan` → **200**.
- Header produksi: CSP `Report-Only`, HSTS `max-age=63072000`, `nosniff`,
  `X-Frame-Options: DENY`, `Permissions-Policy` terkirim.
- Database produksi: 8 migrasi selesai, 19 tabel `public` seluruhnya RLS aktif,
  0 policy, 7 CHECK, 5 index P3.
- Env production (nama saja): 21 variabel, termasuk email/CAPTCHA, Upstash,
  Midtrans, dan AI. Xendit serta variabel opsional belum diisi.
- `GET /api/billing/webhook/midtrans` → **200**; `GET /api/billing/config`
  tanpa sesi → **401**.
- Build lokal (`bun run build`) lulus; halaman `/legal/kebijakan-privasi`
  ter-prerender statis.
- Deployment produksi **Ready** (59 detik): `/legal/kebijakan-privasi` **200**,
  `/produk` memuat "Informasi Penyelenggara" dan tautan "Kebijakan Privasi".

**Sisa risiko**

- Password `admin@ut.ac.id` masih lemah dan hanya layak demo.
- Integrasi (139) dan E2E (13) belum dijalankan ulang pada 16 November karena
  container database uji dimatikan; kode aplikasi tidak berubah sejak `c1e96a2`.
- CSP masih `Report-Only`.
- Status channel Midtrans belum berubah sejak business review; aktivasi Premium
  masih manual.
- **Metode pembayaran ditahan** (16 Nov 2026): belum ada rekening tujuan dan
  `PAYMENT_MANUAL_ONLY=false`, sehingga pembayaran otomatis bergantung pada
  persetujuan Midtrans dan pembayaran nyata belum bisa diproses lewat aplikasi.

## Detail Perbaikan Stabilitas - 18 November 2026

**Perubahan**

- **Upgrade dependensi keamanan**:
  - `next` 16.4.3 → **16.4.6** dan `eslint-config-next` mengikuti. Sebelumnya
    `bun run build` berhenti dengan `SecurityFatalError` karena versi lama masuk
    daftar kerentanan.
  - `sharp` 0.34.3 → **0.35.5**.
  - Override: `lodash` 4.18.1, `postcss` 8.5.33, `nanoid` 3.3.20,
    `source-map-js` 1.2.2.
  - `prisma` dipindah ke `devDependencies` (CLI tidak dibutuhkan saat runtime).
- **Batas ukuran body diperketat**: middleware hanya memeriksa header
  `Content-Length`, sehingga request chunked tanpa header bisa melewati batas.
  Ditambahkan `readLimitedText()` yang membaca stream dan berhenti saat melewati
  batas. `readBody()` dan kedua webhook memakainya; webhook mengembalikan
  **413**.
- **Konsistensi hash password**: registrasi memakai bcrypt cost **12** (sebelumnya
  10), seed demo ikut disamakan.
- **Pengaman seed**: `seed.ts` dan `seed-free-user.ts` menolak `DATABASE_URL`
  non-lokal kecuali `ALLOW_REMOTE_SEED=true`, agar akun demo tidak masuk produksi.
- **Tautan legal**: tombol kembali di halaman legal menuju `/produk` (sebelumnya
  `/` yang mengarah ke login bagi pengunjung).
- Komentar skema `Payment.status` dilengkapi nilai `cancelled`.

**Verifikasi**

- `tsc --noEmit`, `eslint .`, dan `bun run build` → **0 error**.
- Unit **155**, integration **141**, E2E **13** - semuanya lulus.
- Build dengan Next 16.4.6 selesai tanpa `SecurityFatalError`.
- `bun audit`: tidak ada advisory pada paket runtime utama
  (`next`, `sharp`, `lodash`, `postcss`, `nanoid`, `source-map-js`).

**Sisa risiko**

- 31 advisory tersisa berada di rantai perkakas dev/build
  (`eslint-config-next`, `prisma`, `vitest`); tidak ikut runtime produksi.
- Peringatan Turbopack: akses filesystem dinamis di `src/lib/ai.ts` membuat
  seluruh proyek ikut ditelusuri. Tidak menggagalkan build, tetapi memperbesar
  output; dijadwalkan pada fase performa.
- Belum ada alur lupa/reset password (kekurangan fitur, bukan bug).



## Detail Optimasi Perf-1 - 18 November 2026

**Perubahan**

- `/api/documents`: hanya mengambil kolom yang dipakai UI (tanpa `content`),
  pagination cursor (`limit` 50, maks 100) dan filter `status`. Respons kini
  menyertakan `nextCursor`.
- Migrasi `20261118000000_perf_document_indexes`: index `Document(createdAt)`
  dan `Document(uploaderId, createdAt)`; index `uploaderId` tunggal dihapus
  karena tercakup prefix composite.
- `/api/admin/analytics`: status dokumen dihitung dengan `groupBy`, top-3
  dokumen lewat query `take: 3` berurut relasi (tidak lagi memuat semua dokumen).
- `src/lib/ai.ts`: konfigurasi AI hanya dari env; pembacaan `.z-ai-config`
  dihapus. `.z-ai-config.example` dihapus dan nilainya dipindahkan ke `.env`
  lokal tanpa mencetak rahasia.
- UI admin menampilkan tombol **Muat lebih banyak**; pemilih dokumen di chat,
  kuis, dan tugas memakai `?limit=100`.

**Verifikasi**

- Unit **158**, integration **142**, E2E **13** lulus.
- Data 5.000 dokumen: `/api/documents` 198 ms → **11 ms**, 1,01 MB → **10 KB**;
  `/api/admin/analytics` 44 ms → **10 ms**.
- Query dokumen memakai Index Scan: 1,7 ms/1.213 buffer → **0,09 ms/16 buffer**.
- Manifes `api/chat`: file non-`node_modules` **391 → 12**; `.z-ai-config`
  tidak lagi ikut tertracing.

**Sisa untuk Perf-3**

- `/api/collab/analytics` masih 61 ms (p95 75 ms) karena memuat seluruh
  tim/proyek/tugas/aktivitas.
- Project detail masih mengirim ±390 KB untuk 1.000 tugas.
- Belum ada cache header khusus untuk halaman statis.

## Detail Optimasi Perf-2 - 18 November 2026

**Perubahan**

- `/api/collab/analytics`: `groupBy` untuk aktivitas AI dan aktivitas 7 hari,
  tren 14 hari lewat SQL, hanya memuat `task_completed`, dan cache 30 detik per
  pengguna (aktif hanya di produksi).
- Detail proyek: tugas selesai dibatasi 50 dengan `doneTotal`/`doneLoaded`;
  tombol **Muat semua (N)** di kolom Selesai memakai `?done=all`; field tugas
  dipangkas ke yang dipakai UI.
- `next.config.ts`: header cache untuk `/produk` dan `/legal/*`.

**Verifikasi**

- Unit **158**, integration **143**, E2E **13** lulus.
- A/B pada sesi yang sama (50 iterasi): collab analytics 70 ms → **6 ms warm**
  (p95 9 ms), cold 65 ms; project detail 390 KB → **176 KB**.
- Uji regresi: pagination selesai (`50` dari `60`) dan `?done=all` mengembalikan
  seluruh 60 tugas.

**Sisa risiko**

- Cache analitik dapat tertinggal maksimal 30 detik.
- Payload proyek masih 176 KB untuk 1.000 tugas aktif; target <120 KB tidak
  realistis tanpa pagination per kolom (dijadwalkan P3).
- Cache header mengandalkan CDN Vercel; perilaku lokal tidak mewakili.

## Detail P4 - Kesiapan Publik (18 November 2026)

**Perubahan**

- **Reset password**: model `PasswordResetToken` (hash SHA-256, berlaku 1 jam,
  sekali pakai), endpoint `/api/auth/forgot-password` (respons generik agar tidak
  membocorkan email) dan `/api/auth/reset-password`, halaman
  `/forgot-password` & `/reset-password`, tautan dari halaman login.
- **Ganti password**: `/api/profile/password` memverifikasi password lama dan
  memakai bcrypt cost 12; halaman `/akun`.
- **Ekspor & hapus akun**: `/api/profile/export` (JSON) dan `DELETE /api/profile`.
  Penghapusan diblokir untuk akun admin dan akun dengan riwayat pembayaran
  (dijelaskan ke pengguna untuk diajukan ke admin).
- **Kuitansi email**: dikirim otomatis setelah pembayaran lunas (best-effort;
  kegagalan email tidak membatalkan aktivasi).
- **Refund**: tombol di panel admin, alasan wajib, tersimpan di `rawPayload`.
- **Persetujuan S&K**: checkbox wajib sebelum checkout; waktu disimpan di
  `Payment.consentAt` (migrasi `20261118010000_p4_password_reset_consent`).
- **CSP**: header diubah dari `Report-Only` menjadi `Content-Security-Policy`
  penuh.
- **Kredensial admin**: dirotasi ke password kuat (hash bcrypt 12); nilai tidak
  ditulis di dokumen.

**Verifikasi**

- Unit **158**, integration **153**, E2E **13** lulus.
- Migrasi P4 diterapkan ke database uji dan produksi.
- Checkout tanpa `acceptTerms` → **400**.
- Reset token dipakai dua kali → **400**; ganti password lama salah → **400**.
- Hapus akun dengan pembayaran → **409** `has_payments`.
- Refund tanpa alasan → **400**.

**Sisa risiko**

- Sesi JWT yang sudah aktif tidak otomatis logout setelah ganti/reset password
  (perlu rotasi `NEXTAUTH_SECRET` bila dicurigai bocor).
- Email kuitansi bergantung pada Resend; kegagalan dicatat di log.
- Penghapusan akun dengan riwayat pembayaran masih manual oleh admin.

## Detail P5 - Skala & Produk (18 November 2026)

**Perubahan**

- Kanban: setiap kolom dimuat maksimal 50 tugas + `columnCounts`; tombol
  **Muat lagi** memakai `GET /api/collab/projects/:id/tasks?status=&cursor=`.
- Analitik kolaborasi: cache persisten `AnalyticsCache` (L2) di samping cache
  memori 30 detik.
- Email: undangan tim dikirim saat undangan dibuat; cron harian
  `/api/cron/reminders` mengirim ringkasan tenggat (butuh `CRON_SECRET`).
- Audit: tabel `AdminAuditLog` + API `/api/admin/audit`; aksi pembayaran,
  moderasi dokumen, dan perubahan paket tercatat.
- `MotionProvider` dipindah dari root layout ke halaman aplikasi/Collab.
- `scripts/perf/load-test.ts` ditambahkan.

**Verifikasi**

- Unit **158**, integration **161**, E2E **13** lulus.
- Project detail (1.000 tugas) 176 KB → **44,6 KB**, p50 16 ms.
- Load test `/produk` (concurrency 20, 10 detik): **667 RPS**, p95 **44 ms**,
  0 error.
- Migrasi P5 diterapkan; RLS 22 tabel; pgvector 2048 + index HNSW aktif.

**Sisa**

- Tidak ada item P5 yang tertunda. Optimasi lanjutan (mis. analisis bundle per
  chunk, tuning HNSW) bersifat opsional di luar cakupan P5.

## Detail P6 - Pasca Peluncuran (19-20 November 2026)

**Perubahan**

- Web Push produksi: VAPID, service worker, `PushSubscription`, uji Android.
- Notifikasi dalam aplikasi dan siaran admin dengan konfirmasi, password ulang,
  audit log, serta batas 3 siaran per 10 menit.
- Pengaturan pengguna: tema, ukuran teks 90-125%, gerak minimal, pengingat email.
- Sesi tunggal, device ID, email login baru, dan peringatan perangkat lain.
- Masa berlaku sesi absolut 12 jam melalui `SESSION_MAX_HOURS`.
- Kuota AI dikembalikan bila penyedia gagal, badge 10 detik, pesan penyedia
  dibedakan dari kuota aplikasi.
- Banner verifikasi email permanen di halaman Unggah.
- Konsistensi batas dokumen, format PDF/TXT/MD, dan pemecahan otomatis.
- Navigasi mobile, skip link, dan Pernyataan Aksesibilitas.

**Verifikasi**

- Unit **171**, integration **180**, E2E **28**.
- Coverage **79,43%** statement, **68,40%** branch.
- Produksi: login, kuota 30/30, sesi kedaluwarsa 12 jam.
- axe-core 0 pelanggaran.

**Sisa risiko**

- `PushSubscription` belum RLS.
- Token lama belum dicabut setelah ganti/reset password.
- CSP masih memuat `unsafe-inline` dan `unsafe-eval`.
- Uptime check dan alert eksternal belum ada.
- Token penyedia AI belum dicatat.

## Validasi Roadmap (23 November 2026)

**Hasil**

- ROADMAP diperbarui ke P0-P6.
- Angka uji, migrasi, tabel, dan RLS diselaraskan.
- `PushSubscription` ditemukan sebagai satu-satunya tabel tanpa RLS.
- Proposal dan pitch deck masih memakai angka 18 November dan perlu regenerasi.

**Bukti**

- `docs/VALIDASI-ROADMAP-2026-11-23.md`.
- Database produksi: 23 tabel, 22 RLS, 0 policy, 18/18 migrasi.
- 226 chunk bervektor, audit log 0 baris, 1 pembayaran lunas.

## Template entri tahap berikutnya

Salin template ini ke bagian paling bawah **Log tahapan** dan isi:

```markdown
### YYYY-MM-DD - P1 - <judul>

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

