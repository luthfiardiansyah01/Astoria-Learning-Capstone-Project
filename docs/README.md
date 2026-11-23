# Dokumentasi SOBAT ADI

Indeks dokumen proyek. Mulai dari sini bila baru bergabung atau mengambil alih
operasional.

## Status aplikasi

- **Produksi:** https://astoria-learning-capstone-project.vercel.app
- **Fase selesai:** P0, P1, P2, P3, Perf-1, Perf-2, P4, P5
- **Fase berjalan:** P6 (pasca peluncuran), sebagian sudah live
- **Migrasi database:** 18
- **Tabel `public`:** 23, RLS aktif pada 22 tabel, 0 policy publik
- **Verifikasi email + CAPTCHA:** aktif
- **Pembayaran:** **ditahan** (16 Nov 2026) - Midtrans production terpasang, kanal belum disetujui, rekening manual belum diisi; aktivasi manual oleh admin tetap tersedia
- **Test terakhir:** 171 unit, 180 integration, dan 28 E2E (23 Nov 2026)
- **Cakupan:** 79,43% statement, 68,40% branch
- **Akun & keamanan:** reset password, ganti password, ekspor & hapus akun, sesi tunggal, sesi maksimal 12 jam
- **CSP:** enforced sejak 18 November 2026, masih memuat `unsafe-inline` dan `unsafe-eval`
- **Verifikasi produksi terakhir:** 20 November 2026 (login, kuota AI, sesi 12 jam)

## Urutan baca

| Kebutuhan | Dokumen |
|---|---|
| Status, riwayat, dan checklist monitoring | [`MONITORING-LOG.md`](./MONITORING-LOG.md) |
| Pemetaan user, role, plan, dan akses | [`USER-ROLE-MAPPING.md`](./USER-ROLE-MAPPING.md) |
| Prosedur darurat, operasi rutin, SOP Premium manual | [`OPERATIONS-RUNBOOK.md`](./OPERATIONS-RUNBOOK.md) |
| Deploy, env Vercel, migrasi | [`DEPLOY-VERCEL.md`](./DEPLOY-VERCEL.md) |
| Paket Free/Premium, trial, kuota | [`FREEMIUM.md`](./FREEMIUM.md) |
| Pembayaran Midtrans/Xendit & manual | [`PAYMENT-SETUP.md`](./PAYMENT-SETUP.md) |
| Onboarding Midtrans (status in review) | [`MIDTRANS-ONBOARDING.md`](./MIDTRANS-ONBOARDING.md) |
| Business Supporting Document Midtrans | [`MIDTRANS-BUSINESS-DOCS.md`](./MIDTRANS-BUSINESS-DOCS.md) |
| Template surat institusi untuk Midtrans | [`MIDTRANS-CAMPUS-LETTER-TEMPLATE.md`](./MIDTRANS-CAMPUS-LETTER-TEMPLATE.md) |
| Setup Resend + Turnstile | [`EMAIL-VERIFICATION-SETUP.md`](./EMAIL-VERIFICATION-SETUP.md) |
| RLS & keamanan database | [`DATABASE-SECURITY.md`](./DATABASE-SECURITY.md) |
| Checklist uji pengguna/SUS | [`CHECKLIST-UJI-PENGGUNA-SUS.md`](./CHECKLIST-UJI-PENGGUNA-SUS.md) |
| Verifikasi UML/ERD | [`VERIFIKASI-UML-ERD.md`](./VERIFIKASI-UML-ERD.md) |
| Tech stack dalam format akademik (draf bab skripsi) | [`TECH-STACK-SKRIPSI.md`](./TECH-STACK-SKRIPSI.md) |
| Baseline performa & rencana optimasi | [`PERFORMANCE-BASELINE.md`](./PERFORMANCE-BASELINE.md) |
| Rencana implementasi (arsip Oktober 2026) | [`RENCANA-IMPLEMENTASI.md`](./RENCANA-IMPLEMENTASI.md) |
| Roadmap fase P0-P6 & Perf-1/2 | [`ROADMAP.md`](./ROADMAP.md) |
| Validasi roadmap 23 November 2026 | [`VALIDASI-ROADMAP-2026-11-23.md`](./VALIDASI-ROADMAP-2026-11-23.md) |
| Notifikasi, push, dan siaran admin | [`NOTIFIKASI.md`](./NOTIFIKASI.md) |
| Pengaturan pengguna | [`PENGATURAN-PENGGUNA.md`](./PENGATURAN-PENGGUNA.md) |
| Sesi tunggal dan masa berlaku sesi | [`SESI-TUNGGAL.md`](./SESI-TUNGGAL.md) |
| Navigasi mobile dan aksesibilitas | [`UI-MOBILE-A11Y.md`](./UI-MOBILE-A11Y.md) |
| Batas dan pemecahan dokumen | [`BATAS-UNGGAH.md`](./BATAS-UNGGAH.md) |
| Backlog keamanan lanjutan | [`BACKLOG-KEAMANAN.md`](./BACKLOG-KEAMANAN.md) |
| Rencana peningkatan kualitas | [`RENCANA-IMPLEMENTASI-KUALITAS.md`](./RENCANA-IMPLEMENTASI-KUALITAS.md) |
| Proposal pilot kampus | [`PROPOSAL-PILOT-KAMPUS-SOBAT-ADI.md`](./PROPOSAL-PILOT-KAMPUS-SOBAT-ADI.md) |

## Dokumen legal

Sumber Markdown ada di [`legal/`](./legal/), halaman publiknya:

- `/legal/syarat-ketentuan`
- `/legal/kebijakan-produk`
- `/legal/kebijakan-pengembalian-dana`
- `/legal/kebijakan-privasi`

## Dokumen Word

- `Buku-Manual-Aplikasi.docx`
- `Checklist-Uji-Pengguna-SOBAT-ADI.docx`
- `Panduan-Uji-Pengguna-SUS.docx`
- `Proposal-Pilot-Kampus-SOBAT-ADI.docx`
- `Ringkasan-Sesi-SOBAT-ADI.docx`
- `Tech-Stack-SOBAT-ADI-Skripsi.docx`

## Artefak rahasia / lokal

Dokumen onboarding Midtrans yang berisi akun dummy **tidak disimpan di repo**.
Salinannya ada di:

```text
%TEMP%\opencode\midtrans-review\
```

Jangan commit file dari folder tersebut. Setelah review Midtrans selesai,
nonaktifkan akun dummy dan hapus artefaknya.

## Aturan dokumentasi

1. Setiap perubahan fase/perilaku besar wajib menambah entri di `MONITORING-LOG.md`.
2. Jangan menulis password, token, API key, atau isi `.env` di dokumen yang di-commit.
3. Perbarui `README.md` ini bila menambah/menghapus dokumen.

