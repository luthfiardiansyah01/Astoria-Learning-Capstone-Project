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
| **P4** | Kesiapan publik | ⏳ Belum | — |
| **P5** | Skala & produk lanjutan | ⏳ Belum | — |

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

Target: aplikasi aman dipakai pengguna umum dan uang nyata.

| # | Item | Prioritas | Kriteria selesai |
|---|---|---|---|
| 1 | Rotasi kredensial admin | 🔴 Wajib | Login produksi dengan kredensial baru; `SEED_ADMIN_PASSWORD` diperbarui |
| 2 | Lupa/reset password | 🔴 Wajib | Token sekali pakai via email; uji kedaluwarsa dan pemakaian ulang |
| 3 | Hapus akun + ekspor data | 🔴 Wajib | Sesuai janji Kebijakan Privasi; konfirmasi + audit |
| 4 | Kuitansi email saat lunas | 🟠 Penting | Email berisi orderId, nominal, tanggal, masa aktif |
| 5 | Refund + alasan di panel admin | 🟠 Penting | Hanya dari status `paid`; tercatat di audit |
| 6 | Checkbox persetujuan S&K | 🟠 Penting | Waktu persetujuan tersimpan |
| 7 | CSP enforced + monitoring error | 🟠 Penting | Tidak ada pelanggaran kritis; error terpantau |
| 8 | Ganti password dari profil | 🟡 Disarankan | bcrypt cost 12; validasi password lama |

> **Catatan kredensial admin:** password yang dipakai saat ini adalah **data uji
> coba**, bukan kredensial produksi. Nilainya tidak ditulis di dokumen ini;
> simpan di password manager dan `.env.supabase` (tidak di-track). Rotasi
> sebelum aplikasi dipublikasikan — prosedur di
> [`OPERATIONS-RUNBOOK.md`](./OPERATIONS-RUNBOOK.md) bagian 1.1.

## 5. P5 — Skala & produk

| # | Item | Alasan | Prasyarat |
|---|---|---|---|
| 1 | Pagination per kolom Kanban | Payload proyek masih 176 KB pada 1.000 tugas | Perf-2 |
| 2 | Precompute analitik | Permintaan pertama masih ±65 ms | Perf-2 |
| 3 | Bundle JS & lazy-load | ±700 KB per halaman | Pengukuran bundle |
| 4 | Email undangan tim & tenggat | Notifikasi kini hanya in-app | Resend |
| 5 | Audit log aksi admin | Akuntabilitas moderasi/pembayaran | Skema baru |
| 6 | pgvector untuk RAG | Pencarian vektor saat korpus besar | Kapasitas DB |
| 7 | Uji beban & monitoring | Belum ada pengukuran konkurensi | P4 selesai |

## 6. Aturan penomoran ke depan

1. Fase produk memakai **P** (P4, P5, …) dan hanya untuk perubahan perilaku
   atau kesiapan operasional.
2. Optimasi performa memakai **Perf-N** dan wajib menyertakan angka
   sebelum/sesudah di `PERFORMANCE-BASELINE.md`.
3. Setiap fase selesai wajib menambah entri di `MONITORING-LOG.md` dengan bukti
   yang dapat diverifikasi (commit, status HTTP, angka uji).
4. Dokumen ini diperbarui saat status fase berubah.
