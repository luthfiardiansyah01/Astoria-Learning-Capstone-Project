# Paket Freemium SOBAT ADI - Matriks Implementasi

Dokumen ini mencatat apa yang **benar-benar ditegakkan di server**, apa yang hanya
berupa validasi UI, dan hal yang perlu diperhatikan sebelum peluncuran publik.

## Batas paket

| Fitur | Free | Premium | Ditegakkan di |
|---|---:|---:|---|
| AI / hari | 30 | 300 | `guardAi()` pada semua rute AI |
| AI / menit | 5 | 20 | `guardAi()` |
| Isi dokumen | 8.000 karakter | 20.000 karakter | `POST /api/documents` |
| PDF | 2 MB | 5 MB | UI unggah (pre-check `file.size`) |
| Teks | 1 MB | 1 MB | UI unggah (pre-check `file.size`) |
| Tim dibuat | 1 | 10 | `POST /api/collab/teams` |
| Proyek / tim | 2 | 10 | `POST /api/collab/projects` |
| Tugas / proyek | 10 | 100 | `POST /api/collab/projects/:id/tasks` |
| Anggota / tim | 3 | 30 | `POST /api/collab/teams/:id/members` |

Rute AI yang memakai kuota: chat Mentor, generate kuis, submit kuis, unggah
dokumen (prosesor + moderator + embedding), Mentor AI tugas Collab, dan
analitik admin. Sapaan beranda sekarang dibuat lokal tanpa memanggil AI,
sehingga tidak memotong kuota.

## Aturan penting

- **Batas proyek/tugas/anggota mengikuti paket owner tim**, bukan paket anggota
  yang membuatnya. Jadi tim milik akun Premium tetap punya kapasitas Premium
  meskipun anggotanya Free.
- **Batas tim dihitung dari tim yang dibuat/dimiliki**, bukan jumlah tim yang
  diikuti. Pengguna Free tetap bisa diundang ke tim orang lain.
- **Anggota baru harus menerima undangan** sebelum menjadi anggota aktif dan
  bisa mengakses proyek/tugas. Undangan pending dihitung terhadap batas anggota.
- **Dokumen unggahan baru selalu berstatus `pending`**. AI hanya boleh menolak
  otomatis; persetujuan untuk membagikan dokumen selalu dilakukan admin.
- **Trial Premium 7 hari** diberikan setelah email terverifikasi. Akun baru
  berstatus Free sampai verifikasi; fitur AI dan klaim trial manual ditolak
  sebelum email diverifikasi. Pengguna lama di-backfill sebagai terverifikasi.
- **Kuota AI harian direset setiap 00.00 WIB**, bukan 24 jam sejak request pertama.
  Kuota per menit tetap berlaku.
- **Admin selalu Premium** tanpa perlu langganan.
- **Pembayaran** memakai Midtrans/Xendit. Webhook diverifikasi signature/token,
  nominal dicocokkan, dan aktivasi bersifat idempoten.
- **Pembayaran manual**: admin dapat mengaktifkan Premium 30/90/365 hari atau
  menandai transaksi pending sebagai lunas.
- **Mode transfer manual** (`PAYMENT_MANUAL_ONLY=true`): checkout tidak memanggil
  gateway. Pesanan tetap tercatat sebagai `Payment` pending berisi `orderId`, dan
  admin mengonfirmasi setelah bukti transfer diterima. Fitur ini **belum
  diaktifkan di produksi** (ditahan per 16 November 2026).

## Yang perlu diketahui sebelum publik

1. **Kanal pembayaran Midtrans masih menunggu business review.** Kredensial
   production sudah terpasang (`PAYMENT_PROVIDER`, server/client key,
   `MIDTRANS_IS_PRODUCTION=true`), jadi checkout aktif secara teknis. Metode
   bayar (QRIS, VA, e-wallet) belum tentu tersedia sebelum review disetujui;
   sampai saat itu aktivasi Premium manual lewat admin tetap jalur utama.
   Lihat `docs/PAYMENT-SETUP.md`.
2. **Batas ukuran PDF/teks adalah validasi UI.** Server tidak menerima berkas
   asli (hanya teks hasil ekstraksi), sehingga batas keras yang berlaku di server
   adalah jumlah karakter dokumen. Permintaan API manual tetap dibatasi 8.000 /
   20.000 karakter.
3. **Verifikasi email sudah aktif** (`EMAIL_VERIFICATION_ENABLED=true`) bersama
   CAPTCHA Turnstile. Trial hanya diberikan setelah email terverifikasi, dan
   `trialUsedAt` mencegah trial kedua per akun. Risiko yang tersisa: satu orang
   masih dapat membuat beberapa alamat email, jadi pantau pola pendaftaran.
4. **Refund tidak otomatis mencabut Premium.** Status pembayaran menjadi
   `refunded`, tetapi masa aktif tetap berjalan sampai `planExpiresAt`.
5. **Transaksi pending lama** ditandai `expired` saat pengguna memulai checkout
   berikutnya (bukan lewat cron).
6. **Kuota penyedia AI terpisah** dari kuota aplikasi. Batas 30/300 adalah batas
   request aplikasi per pengguna, bukan kuota akun OpenRouter/OpenAI.
7. **Rate limit** memakai Upstash di produksi. Tanpa env Upstash, fallback memori
   tidak efektif di serverless.

## Verifikasi cepat

```bash
# status migrasi database
bunx prisma migrate status

# build + cek tipe + lint
bun run build
node node_modules/typescript/bin/tsc --noEmit
bun run lint
```

Uji manual minimum sebelum promosi:

- Akun Free: tim kedua, proyek ketiga, tugas ke-11, anggota ke-4 → `403`.
- Akun Free: dokumen 9.000 karakter → `413`.
- Akun Premium: proyek ke-3, tugas ke-11, anggota ke-4 → berhasil.
- Registrasi baru: akun Free dan **belum terverifikasi**; AI dan klaim trial
  manual → `403 email_unverified`.
- Verifikasi email: trial 7 hari aktif, `trialUsedAt` terisi; percobaan trial
  kedua → `403`.
- Kuota AI harian: reset tepat 00.00 WIB.
- Webhook tanpa signature/token → `401`.
- Admin: aktifkan/perpanjang paket, konfirmasi pembayaran pending.
