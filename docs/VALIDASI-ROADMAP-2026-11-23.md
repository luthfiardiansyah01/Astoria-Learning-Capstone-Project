# Validasi Roadmap SOBAT ADI - 23 November 2026

Dokumen ini membandingkan `ROADMAP.md` dengan kode yang berjalan, database
produksi, dokumen teknis lain, proposal, dan pitch deck.

## 1. Ringkasan

| Kategori | Hasil |
|---|---|
| Fase P0-P3 dan Perf-1/Perf-2 | Sesuai |
| P4 | Sebagian besar sesuai, 2 klaim perlu diperjelas |
| P5 | Sebagian besar sesuai, 1 angka usang dan 1 klaim terlalu kuat |
| P6 | Belum ada di roadmap lama, padahal sudah banyak fitur live |
| Proposal `.docx` | Angka uji, migrasi, dan RLS usang |
| Pitch deck `.md` dan `.pptx` | Angka uji, migrasi, RLS, dan jumlah model perlu dikoreksi |
| Dokumen status (`README`, `MONITORING-LOG`, `DATABASE-SECURITY`) | Usang |
| Keamanan database | 1 tabel belum RLS |

## 2. Bukti yang dipakai

- Kode aplikasi di repository ini.
- Database produksi Supabase, dibaca hanya untuk agregat.
- Test suite: **171 unit, 180 integrasi, 28 E2E**.
- Cakupan: **79,43% statement, 68,40% branch**.
- Migrasi: **18/18**.
- Tabel `public`: **23**, RLS aktif pada **22**, policy publik **0**.
- `PushSubscription`: **tanpa RLS**.
- pgvector 0.8.2, index HNSW halfvec(2048), **226 chunk** dan **226 bervektor**.
- `AdminAuditLog`: tabel dan API ada, **0 baris**.
- Pembayaran lunas di produksi: **1**.

## 3. Temuan kritis

### 3.1 `PushSubscription` belum RLS

**Bukti:** query `pg_class` menunjukkan `relrowsecurity = false` untuk
`PushSubscription`. Migrasi `20261119080000_push_subscriptions` tidak
menambahkan RLS.

**Dampak:** klaim "semua tabel memiliki RLS" dan "23 tabel aman" tidak benar.
Tabel menyimpan endpoint push, `p256dh`, dan `auth` per pengguna.

**Tindakan:** tambah migrasi:

```sql
ALTER TABLE "public"."PushSubscription" ENABLE ROW LEVEL SECURITY;
```

### 3.2 Klaim RLS terlalu kuat

**Bukti:** 0 policy RLS. Aplikasi memakai role server melalui Prisma, sehingga
melewati RLS.

**Dampak:** kalimat "Data pengguna dipisahkan lewat RLS" di pitch deck
menyesatkan. RLS menutup akses `anon`/PostgREST, bukan memisahkan data
antarpengguna di dalam aplikasi. Pemisahan data dilakukan oleh otorisasi route
API.

**Tindakan:** ubah klaim menjadi "RLS aktif pada 22 dari 23 tabel untuk menutup
akses anon, ditambah otorisasi aplikasi".

### 3.3 Ganti/reset password belum mencabut token

**Bukti:** `POST /api/profile/password` mengganti hash password tanpa mengubah
`activeSessionId`. Route reset password juga tidak mencabut sesi.

**Dampak:** token yang dicuri tetap berlaku sampai sesi 12 jam berakhir.
Dokumen P4 menyebut ganti password selesai, tetapi kriteria keamanan "reset
password mengakhiri sesi" belum terpenuhi.

**Tindakan:** setelah ganti/reset password, set `activeSessionId` baru atau
kosongkan, sehingga semua token lama ditolak pada request berikutnya.

### 3.4 CSP enforced, tetapi belum ketat

**Bukti:** header `Content-Security-Policy` aktif, tetapi `script-src` masih
memuat `'unsafe-inline'` dan `'unsafe-eval'`.

**Dampak:** P4 benar menyebut enforced, tetapi P3 masih menyebut report-only dan
pitch deck menyiratkan perlindungan penuh. Backlog nonce CSP belum selesai.

**Tindakan:** pertahankan status "enforced dengan catatan" sampai nonce dan
penghapusan `unsafe-*` selesai.

### 3.5 Monitoring belum menyeluruh

**Bukti:** logger dan Vercel logs tersedia. Tidak ada uptime check eksternal,
alert, atau pelacakan error seperti Sentry.

**Dampak:** P4 item 7 "monitoring error" hanya terpenuhi sebagian. Gangguan
belum tentu diketahui sebelum pengguna melapor.

**Tindakan:** prioritaskan uptime check dan alert sesuai
`BACKLOG-KEAMANAN.md` item 7.

## 4. Angka yang usang

| Klaim lama | Kondisi 23 November 2026 |
|---|---|
| 158 unit | **171 unit** |
| 161 integrasi | **180 integrasi** |
| 13 E2E | **28 E2E** |
| Cakupan 72,36% | **79,43% statement** |
| 13/13 migrasi | **18/18 migrasi** |
| 22 tabel | **23 tabel** |
| 22 tabel RLS | **22 dari 23** |
| 225 chunk | **226 chunk** |
| Audit log admin | Fitur ada, **0 baris** |

Angka 667 RPS, p95 44 ms, 1 transaksi lunas, dan SUS 67,6 masih sesuai catatan,
dengan syarat uji beban disebut **lokal**, bukan produksi.

## 5. Ketidaksesuaian per dokumen

| Dokumen | Masalah | Tindakan |
|---|---|---|
| `ROADMAP.md` | Tanggal 18 Nov, P5 selesai penuh, P6 tidak ada | Diperbarui 23 Nov, P4/P5 dengan catatan, P6 ditambahkan |
| `README.md` | P0-P3, 13 migrasi, 19 RLS, 158/161/13 | Diperbarui |
| `MONITORING-LOG.md` | Deployment 13 Nov, 13/13 migrasi, 22 tabel | Diperbarui |
| `DATABASE-SECURITY.md` | 22 tabel, 13 migrasi, semua RLS | Diperbarui, `PushSubscription` dicatat |
| `BACKLOG-KEAMANAN.md` | Sesi belum dikerjakan | Diperbarui, sesi 12 jam selesai sebagian |
| `SESI-TUNGGAL.md` | 158/176/23 | Diperbarui |
| `PERFORMANCE-BASELINE.md` | 158/142/13 | Diberi label snapshot 18 Nov |
| `Pitch-Deck-SOBAT-ADI.md` | 22 RLS, 13 migrasi, 158/161/13, 72,36% | Diperbarui |
| `Pitch-Deck-SOBAT-ADI.pptx` | Sama, plus "3 model cadangan" | Diperbarui |
| `Proposal-Bisnis-SOBAT-ADI.docx` | 158/161/13, 72,36%, 13/13, 22 RLS | Diperbarui |
| `Proposal-Ide-Bisnis-SOBAT-ADI.docx` | Sama | Diperbarui |

## 6. Fitur pasca-P5 yang belum masuk roadmap lama

Semua fitur ini sudah live atau sudah diuji:

1. Web Push, notifikasi dalam aplikasi, dan siaran admin.
2. Pengaturan tema, ukuran teks, gerak minimal, dan pengingat email.
3. Sesi tunggal, device ID, email login baru, dan peringatan perangkat lain.
4. Masa berlaku sesi 12 jam.
5. Refund kuota AI saat penyedia gagal dan badge kuota 10 detik.
6. Banner verifikasi email di halaman Unggah.
7. Konsistensi batas dokumen dan pemecahan otomatis.
8. Navigasi mobile, skip link, dan Pernyataan Aksesibilitas.

Roadmap sekarang menampung semuanya sebagai **P6**.

## 7. Yang belum selesai dan tidak boleh diklaim selesai

| Item | Status |
|---|---|
| RLS `PushSubscription` | Belum |
| Rotasi sesi setelah ganti/reset password | Belum |
| Idle timeout | Belum |
| 2FA | Belum |
| Kelola sesi dan perangkat | Belum |
| Verifikasi ulang semua aksi admin | Sebagian, baru siaran |
| CSP ketat tanpa `unsafe-*` | Belum |
| Uptime dan alert eksternal | Belum |
| Pengukuran token penyedia AI | Belum |
| Audit log admin punya bukti pemakaian | Belum, 0 baris |

## 8. Rekomendasi prioritas

1. **P0:** migrasi RLS `PushSubscription`.
2. **P0:** cabut sesi setelah ganti/reset password.
3. **P1:** uptime check dan alert error.
4. **P1:** verifikasi ulang password untuk semua aksi admin.
5. **P2:** 2FA dan kelola sesi.
6. **P2:** CSP ketat berbasis nonce.
7. **P2:** catat `prompt_tokens` dan `completion_tokens` per request.
8. **Dokumentasi:** regenerasi proposal dan pitch deck dengan angka bagian 4.

## 9. Kesimpulan

Roadmap lama masih benar untuk P0 sampai P3 dan optimasi performa. P4 dan P5
sebagian besar sudah sesuai, tetapi ada klaim keamanan dan monitoring yang
terlalu kuat. Perubahan terbesar adalah munculnya P6 yang belum tercatat:
notifikasi, pengaturan, sesi, kuota, dan aksesibilitas.

Setelah pembaruan ini, ROADMAP menjadi sumber status yang lebih jujur. Proposal
dan pitch deck sudah memakai angka 171/180/28, 18 migrasi, dan 22 dari 23 tabel
RLS. Sisa pekerjaan ada pada kode keamanan (RLS `PushSubscription` dan rotasi
sesi setelah ganti password), bukan pada angka dokumen.
