# Roadmap SOBAT ADI

Dokumen ini menyatukan seluruh tahapan: fase produk (P0–P5) dan jalur optimasi
performa (**Perf-1, Perf-2, …**). Penomoran performa sengaja dipisahkan agar
tidak bentrok dengan fase produk.

Terakhir diperbarui: 18 November 2026.

## 1. Cara membaca

| Rangkaian | Fokus | Penomoran |
|---|---|---|
| **P0–P5** | Keamanan, integritas, kesiapan publik, skala produk | Fase |
| **Perf-1, Perf-2** | Optimasi terukur (latensi, payload, artefak deploy) | Tahap optimasi |

Catatan sejarah: `RENCANA-IMPLEMENTASI.md` memakai istilah "Poin 4 — kesiapan
produksi + deploy". Itu **sudah selesai** dan bukan "P4" dalam roadmap ini.

## 2. Ringkasan status

| Fase | Fokus | Status | Bukti utama |
|---|---|---|---|
| **P0** | Keamanan dasar: rotasi DB, rate limit, admin, Midtrans internal | ✅ Selesai | `322c481` |
| **P1** | Anti-abuse: body limit, moderasi, undangan, verifikasi email + CAPTCHA | ✅ Selesai | `4764de7` |
| **P2** | Integritas & UX: limit atomik, state URL/kuis, XP, aksesibilitas | ✅ Selesai | `6fc1afe` |
| **P3** | Hardening skema: index, CHECK, cleanup, CSP report-only | ✅ Selesai | `c1e96a2` |
| **Perf-1** | Dokumen & analitik: pagination, index, agregasi SQL, tracing | ✅ Selesai | `195b359` |
| **Perf-2** | Analitik kolaborasi, payload proyek, cache statis | ✅ Selesai | `ae36f89` |
| **P4** | Kesiapan publik | ✅ Selesai (18 Nov 2026) | `MONITORING-LOG.md` entri 18 Nov |
| **P5** | Skala & produk lanjutan | ⚠️ Sebagian (5 selesai, 2 tertunda) | lihat bagian 5 |

## 3. Fase yang sudah selesai

### P0 — Keamanan dasar
Kriteria selesai: password DB dirotasi, rate limit per IP aktif dengan
fail-closed, akun admin diamankan, alur Midtrans internal teruji.

### P1 — Anti-abuse
Kriteria: body limit 1 MB (webhook 256 KB), moderasi seluruh teks tanpa
auto-approve, undangan tim wajib diterima, verifikasi email + CAPTCHA aktif,
trial hanya setelah verifikasi.

### P2 — Integritas data & UX
Kriteria: batas paket atomik dengan row lock, view tersimpan di URL, sesi kuis
per pengguna, XP sekali per soal, toast terpadu, Kanban dapat dioperasikan
keyboard.

### P3 — Hardening skema & pembersihan
Kriteria: migrasi constraint/index, unique urutan tugas, CHECK status/role/plan,
`Payment` ON DELETE RESTRICT, 23 komponen/dependency dihapus, CSP report-only.

### Perf-1 — Dokumen & analitik
Kriteria: `/api/documents` terpaginasi dan tidak lagi mengambil kolom `content`;
index `Document(createdAt)`; analitik admin memakai agregasi SQL; manifes fungsi
tidak lagi menyeret file proyek. Hasil: 198 ms → 11 ms, 1,01 MB → 10 KB.

### Perf-2 — Analitik kolaborasi & payload
Kriteria: aktivitas diagregasi di SQL, tren 14 hari dihitung di database, cache
30 detik, tugas selesai dibatasi 50 dengan tombol "Muat semua", header cache
halaman statis. Hasil: 6 ms (hangat), 390 KB → 176 KB.

## 4. P4 — Kesiapan publik

**Status: ✅ Selesai — 18 November 2026.**

| # | Item | Prioritas | Implementasi |
|---|---|---|---|
| 1 | Rotasi kredensial admin | 🔴 Wajib | Password baru kuat; hash bcrypt 12; `SEED_ADMIN_PASSWORD` diperbarui |
| 2 | Lupa/reset password | 🔴 Wajib | `/forgot-password`, `/reset-password`, token hash 1 jam sekali pakai |
| 3 | Hapus akun + ekspor data | 🔴 Wajib | `/akun`: unduh JSON; hapus akun (diblokir bila ada riwayat pembayaran) |
| 4 | Kuitansi email saat lunas | 🟠 Penting | Dikirim otomatis setelah `settlePayment` berhasil |
| 5 | Refund + alasan di panel admin | 🟠 Penting | Tombol refund; alasan wajib; tersimpan di `rawPayload` |
| 6 | Checkbox persetujuan S&K | 🟠 Penting | Wajib sebelum checkout; waktu disimpan di `Payment.consentAt` |
| 7 | CSP enforced + monitoring error | 🟠 Penting | Header `Content-Security-Policy` penuh; logger + Vercel logs |
| 8 | Ganti password dari profil | 🟡 Disarankan | `/akun`: verifikasi password lama, hash bcrypt 12 |

Verifikasi P4: unit 158, integrasi 153, E2E 13 lulus; migrasi
`20261118010000_p4_password_reset_consent` diterapkan; CSP enforced.

> **Catatan kredensial admin:** password uji coba lama sudah **dirotasi pada
> 18 November 2026**. Nilai baru tidak ditulis di dokumen ini; simpan di password
> manager dan `.env.supabase` (tidak di-track). Prosedur rotasi ada di
> [`OPERATIONS-RUNBOOK.md`](./OPERATIONS-RUNBOOK.md) bagian 1.1.

## 5. P5 — Skala & produk

| # | Item | Status | Catatan |
|---|---|---|---|
| 1 | Pagination per kolom Kanban | ✅ Selesai | 50 tugas/kolom + tombol "Muat lagi"; payload 390→**44,6 KB** |
| 2 | Precompute analitik | ✅ Selesai | Cache persisten `AnalyticsCache` + cache memori 30 detik |
| 3 | Bundle JS & lazy-load | ⚠️ Sebagian | `MotionProvider` dipindah dari root layout; JS publik masih ±703 KB dan perlu analisis bundle lanjutan |
| 4 | Email undangan tim & tenggat | ✅ Selesai | Email undangan + cron harian `/api/cron/reminders` (butuh `CRON_SECRET`) |
| 5 | Audit log aksi admin | ✅ Selesai | Tabel `AdminAuditLog`, pencatatan pembayaran/moderasi/paket, API `/api/admin/audit` |
| 6 | pgvector untuk RAG | ⚠️ Siap diaktifkan | Migrasi opsional membuat ekstensi + kolom bila tersedia; aplikasi tetap memakai fallback JSON sampai ekstensi Supabase diaktifkan |
| 7 | Uji beban & monitoring | ✅ Selesai | `scripts/perf/load-test.ts`: 667 RPS, p95 44 ms, 0 error (concurrency 20, 10 detik) |

Rincian P5 ada di `PERFORMANCE-BASELINE.md` bagian 13.

## 6. Aturan penomoran ke depan

1. Fase produk memakai **P** (P4, P5, …) dan hanya untuk perubahan perilaku
   atau kesiapan operasional.
2. Optimasi performa memakai **Perf-N** dan wajib menyertakan angka
   sebelum/sesudah di `PERFORMANCE-BASELINE.md`.
3. Setiap fase selesai wajib menambah entri di `MONITORING-LOG.md` dengan bukti
   yang dapat diverifikasi (commit, status HTTP, angka uji).
4. Dokumen ini diperbarui saat status fase berubah.
