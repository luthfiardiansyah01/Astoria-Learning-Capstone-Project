# Runbook Operasional SOBAT ADI

Dokumen ini merangkum prosedur darurat dan operasi rutin yang tidak tercakup di
`DEPLOY-VERCEL.md` atau `PAYMENT-SETUP.md`.

Catatan monitoring harian, status tiap fase, dan sisa risiko dicatat di
`docs/MONITORING-LOG.md`. Setiap tahap baru wajib menambahkan entri di sana.

Setup verifikasi email dan CAPTCHA ada di `docs/EMAIL-VERIFICATION-SETUP.md`.

## 1. Akun admin

Admin saat ini:

| Email | Status | Catatan |
|---|---|---|
| `admin@ut.ac.id` | Aktif | Domain aktif, dipakai untuk operasi harian. Hash bcrypt (cost 12) di database; `SEED_ADMIN_PASSWORD` di `.env.supabase` (tidak di-track git). |
| `admin@sobat-adi.id` | Legacy | Domain tidak aktif. Jangan dihapus sebelum login admin aktif diverifikasi. |

Catatan kredensial (per 18 November 2026):

- Password `admin@ut.ac.id` saat ini adalah **data uji coba** (singkat, hanya
  layak untuk demo internal). Rotasi sebelum aplikasi dipakai publik atau
  dinilai oleh penguji luar.
- `.env.supabase` menyimpan `SEED_ADMIN_PASSWORD` dalam bentuk teks biasa. File
  itu hanya untuk seeding lokal dan tidak boleh diunggah, dikirim lewat chat,
  atau ditempel ke dokumen Word.
- Yang berlaku saat login adalah **hash di database**, bukan isi
  `.env.supabase`. Jika keduanya berbeda, login memakai hash lama.

Aturan:

1. Minimal dua akun admin harus ada setiap saat.
2. Jangan menyimpan password admin di repository, dokumen Word, atau chat.
3. Simpan kredensial di password manager. File `.env.supabase` hanya untuk seeding lokal.
4. Bila salah satu admin diduga bocor: reset password akun tersebut, lalu audit
   `ActivityEvent` dan `Payment` untuk aktivitas mencurigakan.
5. Jangan pernah mencetak password/URL database ke terminal. Riwayat PowerShell
   yang memuat `DATABASE_URL` atau host database sudah dibersihkan; ulangi
   pemeriksaan bila ada insiden.

### 1.1 Rotasi password admin

Tidak ada endpoint publik untuk mengganti password admin; lakukan lewat skrip
lokal dengan `bcrypt` cost 12 agar sama dengan hash yang dibuat saat seeding.

Sebelum menjalankan, pastikan `DATABASE_URL` menunjuk database yang ingin
diubah: `.env` untuk database yang dipakai aplikasi lokal, `.env.supabase` untuk
produksi. Skrip di bawah memakai `PrismaClient` biasa, jadi variabel itu harus
sudah termuat (Bun memuat `.env` otomatis dari folder proyek).

1. Siapkan password baru (minimal 16 karakter, campur huruf besar/kecil, angka,
   simbol). Jangan tulis di chat.
2. Jalankan skrip sementara di folder proyek:

   ```ts
   // scripts/_tmp-admin-reset.ts
   import bcrypt from "bcryptjs";
   import { PrismaClient } from "@prisma/client";

   const email = "admin@ut.ac.id";
   const password = process.env.NEW_ADMIN_PASSWORD!;
   const passwordHash = await bcrypt.hash(password, 12);
   const db = new PrismaClient();

   try {
     const result = await db.user.updateMany({
       where: { email, role: "admin" },
       data: { passwordHash },
     });
     if (result.count !== 1) throw new Error("admin tidak ditemukan/tidak unik");
     console.log("diperbarui:", result.count);
   } finally {
     await db.$disconnect();
   }
   ```

3. Set `NEW_ADMIN_PASSWORD` hanya di sesi terminal, jalankan
   `bun scripts/_tmp-admin-reset.ts`, lalu hapus skrip dan variabel tersebut.
   Jika terminal menyimpan riwayat perintah, jalankan `Clear-History` setelahnya.
4. Verifikasi login produksi: `POST /api/auth/callback/credentials` → **200**
   dan `/api/auth/session` mengembalikan `role=admin`.
5. Perbarui `SEED_ADMIN_PASSWORD` di `.env.supabase` agar seeding berikutnya
   tidak mengembalikan password lama.
6. Catat tanggal rotasi di `MONITORING-LOG.md` (tanpa menulis password).

## 2. Rate limit produksi

Rate limit memakai Upstash Redis REST (`UPSTASH_REDIS_REST_URL`,
`UPSTASH_REDIS_REST_TOKEN`). Di Vercel kedua variabel wajib ada untuk Production.

Variabel tambahan:

- `RATE_LIMIT_FAIL_CLOSED=true` — bila Redis tidak tersedia, login, register,
  checkout, upload, dan AI **ditolak** alih-alih memakai memori per-instance.
  Ini mencegah bypass rate limit di serverless. Bila sedang outage Upstash dan
  login harus tetap dibuka, set ke `false` lalu redeploy.

Batas utama (`src/lib/rate-limit.ts`):

| Aksi | Batas |
|---|---|
| Login per akun+IP | 10 / 15 menit |
| Login per IP (lintas akun) | 60 / 15 menit |
| Register per IP | 5 / jam |
| Checkout per user | 5 / jam |
| Upload per user | 10 / jam |
| AI per user | 5–20 / menit dan 30–300 / hari (sesuai paket, reset 00.00 WIB) |

Uji cepat di produksi: lakukan 11 login gagal ke satu akun dari satu IP, lalu
pastikan respons berikutnya ditolak. Jangan menguji ke akun admin asli.

## 3. Rotasi kredensial database

Jangan cetak password ke terminal, log, atau chat.

> Catatan penting: role `postgres` di Supabase **bukan superuser**. Perintah
> `ALTER ROLE postgres WITH PASSWORD ...` lewat SQL akan ditolak dengan
> `42501 permission denied to alter role`. Rotasi harus lewat Dashboard.

1. Buat password baru yang panjang (minimal 32 karakter acak).
2. Buka Supabase Dashboard → Project → Database → **Reset database password**
   (atau Settings → Database → Reset database password).
3. Simpan password baru di password manager.
4. Perbarui `DATABASE_URL` dan `DIRECT_URL` di:
   - Vercel → Project → Settings → Environment Variables (Production)
   - `.env` dan `.env.supabase` lokal (tidak di-track)
5. Redeploy production.
6. Verifikasi login, dashboard, dan satu operasi tulis (mis. update profil).
7. Hapus salinan password lama dari catatan sementara.

Alternatif otomatis (yang dipakai pada rotasi 7 November 2026): buat Personal
Access Token yang di-scope ke project dengan izin `database_config_write`,
simpan token di file lokal (jangan di chat), lalu panggil:

```text
PATCH https://api.supabase.com/v1/projects/{ref}/database/password
Authorization: Bearer <token>
{ "password": "<password-baru>" }
```

Setelah `DATABASE_URL`/`DIRECT_URL` diperbarui dan deploy diverifikasi, hapus
token tersebut.

Downtime singkat mungkin terjadi antara rotasi dan deploy selesai. Lakukan di
luar jam sibuk.

Riwayat rotasi:
- 7 November 2026 — password database dirotasi lewat Supabase Management API
  (`PATCH /v1/projects/{ref}/database/password`), lalu `DATABASE_URL` dan
  `DIRECT_URL` diperbarui di Vercel Production. Koneksi baru diverifikasi
  sebelum token akses dihapus.

## 4. Aktivasi Premium manual (SOP)

Midtrans production sudah terkonfigurasi, tetapi kanal pembayaran masih menunggu
**business review**. Akibatnya Snap bisa gagal membuat transaksi. Sampai kanal
disetujui, aktivasi Premium dilakukan manual dengan **dua jalur**:

- **Jalur B (utama)** — konfirmasi transaksi yang tercatat. Ada jejak pembayaran
  dan masuk statistik pendapatan. Pakai ini untuk pembayaran nyata.
- **Jalur A (cadangan)** — aktivasi langsung dari panel pengguna. Tidak ada baris
  `Payment`, jadi tidak masuk statistik. Pakai untuk kompensasi, demo, atau uji
  internal.

### 4.1 Jalur B — konfirmasi transaksi (utama)

Jalur ini memerlukan **gateway terkonfigurasi** (provider bukan `none`), karena
baris `Payment` dibuat oleh `POST /api/billing/checkout`. Bila tidak ada
kredensial sama sekali, checkout mengembalikan `503` tanpa membuat baris, dan
satu-satunya pilihan adalah Jalur A.

**Yang dilakukan pengguna**

1. Buka dialog **Paket** lalu klik **Upgrade Sekarang**.
2. Sistem membuat baris `Payment` dengan `orderId` berformat
   `SOBAT-YYYYMMDDHHMMSS-XXXXXXXX`, nominal **Rp19.000**, `durationDays` 30,
   status `pending`.
3. Dua kemungkinan:
   - Snap berhasil → pengguna melanjutkan pembayaran di halaman Midtrans;
   - Snap gagal (kanal belum disetujui) → pengguna melihat pesan error dan
     transaksi berubah menjadi **`failed`**, tetapi barisnya tetap tersimpan.
4. Pengguna transfer **Rp19.000** ke rekening yang diberikan admin dan menuliskan
   **`orderId` pada berita transfer**.
5. Pengguna mengirim bukti transfer + `orderId` ke admin
   (`admin1@moedatrace.com`).

**Yang dilakukan admin**

1. Buka **Admin → tab "Paket & Pembayaran" → Pembayaran terbaru**.
2. Cocokkan empat hal sebelum menekan apa pun:
   - `orderId` sama dengan yang ditulis pengguna;
   - nominal **tepat Rp19.000**;
   - nama/email pengguna sesuai;
   - waktu transfer masuk akal terhadap `createdAt`.
3. Bila cocok, klik ikon centang **Tandai lunas**
   (`PATCH /api/admin/payments/{paymentId}` dengan `{ "status": "paid" }`).
4. Verifikasi hasilnya:
   - status berubah `paid`, `paidAt` terisi;
   - `expiresAt` = `max(sekarang, masa aktif lama) + payment.durationDays`
     (default 30 hari);
   - pengguna menerima notifikasi "Premium aktif sampai …".
5. Bila **tidak** cocok atau bukti tidak ada: **jangan** menandai lunas. Bila
   pengguna membatalkan, gunakan **Batalkan pesanan**.

**Aturan teknis**

- Konfirmasi bersifat **idempoten**: klik dua kali atau webhook duplikat tidak
  menambah masa aktif dua kali.
- Nominal tidak dapat diubah admin saat konfirmasi; yang tersimpan di `Payment`
  yang dipakai.
- Perpanjangan **menumpuk** dari sisa masa aktif, bukan menimpa.
- Durasi mengikuti `Payment.durationDays` (default 30 hari), bukan pilihan
  30/90/365 di panel pengguna.
- Akun admin tidak bisa diaktifkan/diubah dari panel; role admin selalu Premium.

### 4.2 Jalur A — aktivasi langsung (cadangan)

1. Buka **Admin → "Paket & Pembayaran"** → cari pengguna.
2. Pilih `Premium` dan durasi `30 / 90 / 365 hari`.
3. Klik **Premium** (atau **Perpanjang** bila sudah Premium).
4. Sistem mengisi `planExpiresAt` dari `max(sekarang, masa aktif lama) + durasi`
   dan mengirim notifikasi.

Gunakan hanya bila tidak ada transaksi yang bisa dikonfirmasi. Catat alasannya
di `MONITORING-LOG.md` agar statistik pendapatan tidak disalahartikan.

### 4.3 Pembatalan, refund, dan pencabutan

| Aksi | Syarat | Efek |
|---|---|---|
| `paid` | status bukan `paid`/`refunded` | Premium diperpanjang + notifikasi |
| `cancelled` | belum `paid` | Dibatalkan; gateway ikut dibatalkan bila memungkinkan |
| `refunded` | **harus** sudah `paid` | Dicatat untuk audit; **Premium tidak dicabut otomatis** |
| `failed` / `expired` | kapan saja | Hanya status; paket tidak berubah |

Catatan:

- Refund **belum ada tombolnya di panel**; saat ini hanya lewat
  `PATCH /api/admin/payments/{paymentId}` dengan `{ "status": "refunded" }`.
- Untuk mencabut Premium setelah refund, ubah paket ke Free lewat Jalur A.
- Pesanan yang sudah `paid` tidak bisa dibatalkan, hanya di-refund.

### 4.4 Bukti dan audit

- Simpan bukti transfer di folder lokal (mis. `%TEMP%\opencode\bukti-transfer\`),
  **jangan** di-commit ke repository.
- Jangan pernah menandai `paid` tanpa bukti yang nominalnya cocok.
- Bukti nyata bahwa alur ini berjalan: transaksi
  `SOBAT-20261114171653-167536CC` (Rp19.000) dikonfirmasi 14 November 2026 dan
  mengaktifkan Premium sampai 14 Desember 2026.

## 5. Checklist go-live Midtrans

- [ ] Business review disetujui dan channel pembayaran muncul di dashboard.
- [ ] `MIDTRANS_IS_PRODUCTION=true`, server/client key production terpasang.
- [ ] Webhook `https://<domain>/api/billing/webhook/midtrans` terdaftar.
- [ ] Uji transaksi kecil → status `settlement` → Premium aktif.
- [ ] Uji webhook duplikat → Premium tidak bertambah dua kali.
- [ ] Uji pembatalan sebelum bayar → status `cancelled`.
- [ ] Uji refund → status `refunded` tercatat.
- [ ] Uji `capture + fraud_status=deny` → status `failed`, bukan `paid`.
- [ ] Pastikan halaman legal dan kontak admin dapat diakses.

## 6. Dokumentasi & artefak Midtrans

- Indeks dokumen: `docs/README.md`.
- Jawaban formulir onboarding: `docs/MIDTRANS-ONBOARDING.md`.
- Katalog dan PDF alur transaksi (berisi akun dummy) disimpan di
  `%TEMP%\opencode\midtrans-review\`, **tidak di-commit**.
- Nonaktifkan akun dummy setelah review Midtrans selesai.
- CSP masih `Report-Only`; pantau laporan sebelum mengubahnya menjadi enforced.
- `Payment.userId` memakai `ON DELETE RESTRICT`; arsipkan user dengan riwayat
  pembayaran sebelum menghapus.

## 7. Pemeriksaan cepat produksi

Jalankan berurutan saat mencurigai gangguan. Semua perintah hanya membaca data.

| Tujuan | Perintah | Hasil normal |
|---|---|---|
| Halaman publik hidup | `curl.exe -s -o NUL -w "%{http_code}" https://<domain>/login` | `200` |
| Halaman produk (reviewer Midtrans) | `curl.exe -s -o NUL -w "%{http_code}" https://<domain>/produk` | `200` |
| Webhook pembayaran | `curl.exe -s -o NUL -w "%{http_code}" https://<domain>/api/billing/webhook/midtrans` | `200` |
| Konfigurasi billing tidak bocor | `curl.exe -s -o NUL -w "%{http_code}" https://<domain>/api/billing/config` | `401` tanpa sesi |
| Header keamanan | `curl.exe -s -D - -o NUL https://<domain>/produk` | ada CSP `Report-Only`, HSTS, `nosniff`, `DENY` |
| Status migrasi | `bun run db:prod:status` | 8 migrasi, tidak ada yang pending |
| Uji unit cepat | `bun run test:unit` | 150 lulus, ±1 detik |
| Uji integrasi | `docker compose up -d db-test` lalu `bun run test:integration` | 139 lulus |
| Log runtime | `vercel logs --environment production --since 30m --non-interactive` | 0 error, 0 respons 5xx |

Catatan pengujian integrasi: database uji berjalan di port **5434** dan memakai
penyimpanan sementara (`tmpfs`), jadi datanya hilang setiap container dimatikan.
E2E memerlukan build + server (`bun run start:e2e` di port 3100) dan database
uji yang sama.
