# Roadmap SOBAT ADI

Dokumen ini menyatukan tahapan produk (P0-P6) dan jalur optimasi performa
(**Perf-1, Perf-2, ...**). Penomoran performa sengaja dipisahkan agar tidak
bentrok dengan fase produk.

Terakhir diperbarui: **23 November 2026**.

## 1. Cara membaca

| Rangkaian | Fokus | Penomoran |
|---|---|---|
| **P0-P6** | Keamanan, integritas, kesiapan publik, skala, pasca peluncuran | Fase |
| **Perf-1, Perf-2** | Optimasi terukur (latensi, payload, artefak deploy) | Tahap optimasi |

Catatan sejarah: `RENCANA-IMPLEMENTASI.md` memakai istilah "Poin 4 - kesiapan
produksi + deploy". Itu **sudah selesai** dan bukan "P4" dalam roadmap ini.

## 2. Ringkasan status

| Fase | Fokus | Status | Bukti utama |
|---|---|---|---|
| **P0** | Keamanan dasar: rotasi DB, rate limit, admin, Midtrans internal | Selesai | `322c481` |
| **P1** | Anti-abuse: body limit, moderasi, undangan, verifikasi email + CAPTCHA | Selesai | `4764de7` |
| **P2** | Integritas & UX: limit atomik, state URL/kuis, XP, aksesibilitas | Selesai | `6fc1afe` |
| **P3** | Hardening skema: index, CHECK, cleanup, CSP report-only | Selesai | `c1e96a2` |
| **Perf-1** | Dokumen & analitik: pagination, index, agregasi SQL, tracing | Selesai | `195b359` |
| **Perf-2** | Analitik kolaborasi, payload proyek, cache statis | Selesai | `ae36f89` |
| **P4** | Kesiapan publik | Selesai dengan catatan | `MONITORING-LOG.md` |
| **P5** | Skala & produk lanjutan | Selesai dengan catatan | bagian 5 |
| **P6** | Pasca peluncuran: notifikasi, pengaturan, sesi, kuota, keamanan lanjutan | Sebagian | bagian 6 |

"Catatan" berarti fitur utama sudah berjalan, tetapi masih ada keterbatasan
yang belum boleh diklaim sebagai selesai penuh.

## 3. Fase yang sudah selesai

### P0 - Keamanan dasar
Kriteria selesai: password DB dirotasi, rate limit per IP aktif dengan
fail-closed, akun admin diamankan, alur Midtrans internal teruji.

### P1 - Anti-abuse
Kriteria: body limit 1 MB (webhook 256 KB), moderasi seluruh teks tanpa
auto-approve, undangan tim wajib diterima, verifikasi email + CAPTCHA aktif,
trial hanya setelah verifikasi.

### P2 - Integritas data & UX
Kriteria: batas paket atomik dengan row lock, view tersimpan di URL, sesi kuis
per pengguna, XP sekali per soal, toast terpadu, Kanban dapat dioperasikan
keyboard.

### P3 - Hardening skema & pembersihan
Kriteria: migrasi constraint/index, unique urutan tugas, CHECK status/role/plan,
`Payment` ON DELETE RESTRICT, 23 komponen/dependency dihapus, CSP report-only.

CSP dinaikkan menjadi **enforced** pada P4. Namun kebijakan masih memuat
`unsafe-inline` dan `unsafe-eval`, sehingga CSP ketat berbasis nonce masih
menjadi backlog.

### Perf-1 - Dokumen & analitik
Kriteria: `/api/documents` terpaginasi dan tidak lagi mengambil kolom `content`;
index `Document(createdAt)`; analitik admin memakai agregasi SQL; manifes fungsi
tidak lagi menyeret file proyek. Hasil: 198 ms -> 11 ms, 1,01 MB -> 10 KB.

### Perf-2 - Analitik kolaborasi & payload
Kriteria: aktivitas diagregasi di SQL, tren 14 hari dihitung di database, cache
30 detik, tugas selesai dibatasi 50 dengan tombol "Muat semua", header cache
halaman statis. Hasil: 6 ms (hangat), 390 KB -> 176 KB.

## 4. P4 - Kesiapan publik

**Status: selesai dengan catatan. Diverifikasi ulang 23 November 2026.**

| # | Item | Prioritas | Implementasi |
|---|---|---|---|
| 1 | Rotasi kredensial admin | Wajib | Password baru kuat; hash bcrypt 12; `SEED_ADMIN_PASSWORD` diperbarui |
| 2 | Lupa/reset password | Wajib | `/forgot-password`, `/reset-password`, token hash 1 jam sekali pakai |
| 3 | Hapus akun + ekspor data | Wajib | `/akun`: unduh JSON; hapus akun diblokir bila ada riwayat pembayaran |
| 4 | Kuitansi email saat lunas | Penting | Dikirim otomatis setelah `settlePayment` berhasil |
| 5 | Refund + alasan di panel admin | Penting | Tombol refund; alasan wajib; tersimpan di `rawPayload` dan audit log |
| 6 | Checkbox persetujuan S&K | Penting | Wajib sebelum checkout; waktu disimpan di `Payment.consentAt` |
| 7 | CSP enforced + monitoring error | Penting | Header CSP penuh; logger + Vercel logs |
| 8 | Ganti password dari profil | Disarankan | `/akun`: verifikasi password lama, hash bcrypt 12 |

Catatan P4:

- CSP sudah **enforced**, tetapi belum ketat karena masih memakai
  `unsafe-inline` dan `unsafe-eval`.
- Monitoring baru memakai logger dan Vercel logs. Belum ada uptime check
  eksternal atau pelacakan error seperti Sentry.
- Ganti/reset password belum mencabut token yang sudah beredar. Sesi tunggal
  membatasi satu sesi aktif, tetapi token yang dicuri tetap berlaku sampai
  kedaluwarsa.
- Verifikasi 23 November 2026: **171 unit, 180 integrasi, 28 E2E**, migrasi
  **18/18**, tabel `public` **23** dengan RLS aktif pada **22** tabel.

## 5. P5 - Skala & produk

**Status: selesai dengan catatan. Diverifikasi ulang 23 November 2026.**

| # | Item | Status | Catatan |
|---|---|---|---|
| 1 | Pagination per kolom Kanban | Selesai | 50 tugas/kolom + tombol "Muat lagi"; payload 390 -> 44,6 KB |
| 2 | Precompute analitik | Selesai | Cache persisten `AnalyticsCache` + cache memori 30 detik |
| 3 | Bundle JS & lazy-load | Selesai | Provider dipindah dari root layout; JS publik 700 -> 609 KB (-13%) |
| 4 | Email undangan tim & tenggat | Selesai | Email undangan + cron harian `/api/cron/reminders` (butuh `CRON_SECRET`) |
| 5 | Audit log aksi admin | Selesai | Tabel `AdminAuditLog`, API `/api/admin/audit`; 0 baris saat audit karena belum ada aksi admin setelah tabel dibuat |
| 6 | pgvector untuk RAG | Selesai | `vector(2048)`, index HNSW halfvec, 226 chunk tersimpan dan 226 memiliki vektor |
| 7 | Uji beban & monitoring | Selesai dengan catatan | 667 RPS, p95 44 ms, 0 error pada **server lokal**; monitoring produksi masih Vercel logs |

Rincian P5 ada di `PERFORMANCE-BASELINE.md` bagian 13.

## 6. P6 - Pasca peluncuran

Fitur di bawah ini dikerjakan setelah P5 dinyatakan selesai pada 18 November
2026. Sebagian sudah live, sebagian masih backlog.

| # | Item | Status | Bukti |
|---|---|---|---|
| 1 | Web Push + notifikasi dalam aplikasi | Selesai | VAPID, service worker, `PushSubscription`, uji Android |
| 2 | Siaran admin | Selesai | Konfirmasi, password ulang, audit log, batas 3 per 10 menit |
| 3 | Pengaturan pengguna | Selesai | Tema, ukuran teks 90-125%, gerak minimal, pengingat email |
| 4 | Sesi tunggal + device ID | Selesai | `activeSessionId`, `activeDeviceId`, `SessionGuard`, email login baru |
| 5 | Masa berlaku sesi | Selesai | JWT maksimal 12 jam, `SESSION_MAX_HOURS`, dialog sesi berakhir |
| 6 | Kuota AI akurat | Selesai | Refund kuota saat AI gagal, badge 10 detik, pesan penyedia dibedakan |
| 7 | Respons verifikasi email di Unggah | Selesai | Banner permanen, kirim ulang, tombol unggah nonaktif |
| 8 | Konsistensi syarat dokumen | Selesai | `PLAN_LIMITS`, file teks, format PDF/TXT/MD, pemecahan otomatis |
| 9 | Navigasi mobile + aksesibilitas | Selesai | Bottom nav, skip link, halaman Pernyataan Aksesibilitas, axe 0 pelanggaran |
| 10 | Pengukuran token penyedia AI | Direncanakan | Dibutuhkan untuk mengganti estimasi token di proposal |
| 11 | RLS `PushSubscription` | Belum | Satu-satunya tabel `public` tanpa RLS |
| 12 | 2FA, kelola sesi, verifikasi ulang admin, CSP ketat, uptime | Belum | Lihat `BACKLOG-KEAMANAN.md` |

## 7. Status teknis per 23 November 2026

| Pemeriksaan | Kondisi |
|---|---|
| Produksi | `https://astoria-learning-capstone-project.vercel.app` |
| Commit kode terakhir | `714a5e3` (batas sesi 12 jam) |
| Migrasi produksi | **18/18** |
| Tabel `public` | **23** |
| RLS aktif | **22 dari 23** tabel |
| Policy RLS publik | **0** |
| Tabel tanpa RLS | `PushSubscription` |
| pgvector | 0.8.2, HNSW halfvec(2048), 226 chunk bervektor |
| Audit log admin | Tabel dan API siap; 0 baris |
| Unit test | **171** |
| Integration test | **180** |
| E2E | **28** |
| Cakupan | **79,43%** statement, **68,40%** branch |

Catatan RLS: aplikasi mengakses database lewat Prisma dengan role server.
Dengan 0 policy, RLS terutama menutup akses `anon`/`authenticated` melalui
PostgREST, bukan menjadi isolasi data antarpengguna di dalam aplikasi. Otorisasi
aplikasi tetap dilakukan di route API.

## 8. Aturan penomoran ke depan

1. Fase produk memakai **P** (P4, P5, P6, ...) dan hanya untuk perubahan
   perilaku atau kesiapan operasional.
2. Optimasi performa memakai **Perf-N** dan wajib menyertakan angka
   sebelum/sesudah di `PERFORMANCE-BASELINE.md`.
3. Setiap fase selesai wajib menambah entri di `MONITORING-LOG.md` dengan bukti
   yang dapat diverifikasi (commit, status HTTP, angka uji).
4. Dokumen ini diperbarui saat status fase berubah.
5. Proposal dan pitch deck wajib memakai angka pada bagian 7. Bila angka berubah,
   regenerasi `.docx` dan `.pptx`, bukan hanya Markdown.
