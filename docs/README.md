# Dokumentasi SOBAT ADI

Indeks dokumen proyek. Mulai dari sini bila baru bergabung atau mengambil alih
operasional.

## Status aplikasi

- **Produksi:** https://astoria-learning-capstone-project.vercel.app
- **Fase selesai:** P0, P1, P2, P3
- **Migrasi database:** 8
- **RLS:** 19 tabel `public`, 0 policy publik
- **Verifikasi email + CAPTCHA:** aktif
- **Pembayaran:** Midtrans production terpasang; channel menunggu business review
- **Test terakhir:** 150 unit, 139 integration, 13 E2E

## Urutan baca

| Kebutuhan | Dokumen |
|---|---|
| Status, riwayat, dan checklist monitoring | [`MONITORING-LOG.md`](./MONITORING-LOG.md) |
| Prosedur darurat & operasi rutin | [`OPERATIONS-RUNBOOK.md`](./OPERATIONS-RUNBOOK.md) |
| Deploy, env Vercel, migrasi | [`DEPLOY-VERCEL.md`](./DEPLOY-VERCEL.md) |
| Paket Free/Premium, trial, kuota | [`FREEMIUM.md`](./FREEMIUM.md) |
| Pembayaran Midtrans/Xendit & manual | [`PAYMENT-SETUP.md`](./PAYMENT-SETUP.md) |
| Onboarding Midtrans (status in review) | [`MIDTRANS-ONBOARDING.md`](./MIDTRANS-ONBOARDING.md) |
| Setup Resend + Turnstile | [`EMAIL-VERIFICATION-SETUP.md`](./EMAIL-VERIFICATION-SETUP.md) |
| RLS & keamanan database | [`DATABASE-SECURITY.md`](./DATABASE-SECURITY.md) |
| Checklist uji pengguna/SUS | [`CHECKLIST-UJI-PENGGUNA-SUS.md`](./CHECKLIST-UJI-PENGGUNA-SUS.md) |
| Verifikasi UML/ERD | [`VERIFIKASI-UML-ERD.md`](./VERIFIKASI-UML-ERD.md) |
| Rencana implementasi | [`RENCANA-IMPLEMENTASI.md`](./RENCANA-IMPLEMENTASI.md) |
| Rencana peningkatan kualitas | [`RENCANA-IMPLEMENTASI-KUALITAS.md`](./RENCANA-IMPLEMENTASI-KUALITAS.md) |
| Proposal pilot kampus | [`PROPOSAL-PILOT-KAMPUS-SOBAT-ADI.md`](./PROPOSAL-PILOT-KAMPUS-SOBAT-ADI.md) |

## Dokumen legal

Sumber Markdown ada di [`legal/`](./legal/), halaman publiknya:

- `/legal/syarat-ketentuan`
- `/legal/kebijakan-produk`
- `/legal/kebijakan-pengembalian-dana`

## Dokumen Word

- `Buku-Manual-Aplikasi.docx`
- `Checklist-Uji-Pengguna-SOBAT-ADI.docx`
- `Panduan-Uji-Pengguna-SUS.docx`
- `Proposal-Pilot-Kampus-SOBAT-ADI.docx`
- `Ringkasan-Sesi-SOBAT-ADI.docx`

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
