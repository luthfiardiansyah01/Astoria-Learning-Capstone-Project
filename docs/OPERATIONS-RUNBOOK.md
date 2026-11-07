# Runbook Operasional SOBAT ADI

Dokumen ini merangkum prosedur darurat dan operasi rutin yang tidak tercakup di
`DEPLOY-VERCEL.md` atau `PAYMENT-SETUP.md`.

## 1. Akun admin

Admin saat ini:

| Email | Status | Catatan |
|---|---|---|
| `admin@ut.ac.id` | Aktif | Domain aktif, dipakai untuk operasi harian. Password kuat ada di `.env.supabase` (tidak di-track git). |
| `admin@sobat-adi.id` | Legacy | Domain tidak aktif. Jangan dihapus sebelum login admin aktif diverifikasi. |

Aturan:

1. Minimal dua akun admin harus ada setiap saat.
2. Jangan menyimpan password admin di repository, dokumen Word, atau chat.
3. Simpan kredensial di password manager. File `.env.supabase` hanya untuk seeding lokal.
4. Bila salah satu admin diduga bocor: reset password akun tersebut, lalu audit
   `ActivityEvent` dan `Payment` untuk aktivitas mencurigakan.
5. Jangan pernah mencetak password/URL database ke terminal. Riwayat PowerShell
   yang memuat `DATABASE_URL` atau host database sudah dibersihkan; ulangi
   pemeriksaan bila ada insiden.

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

Downtime singkat mungkin terjadi antara rotasi dan deploy selesai. Lakukan di
luar jam sibuk.

## 4. Pembayaran manual (saat channel gateway belum tersedia)

Midtrans production sudah terkonfigurasi, tetapi channel pembayaran bergantung
pada persetujuan business review Midtrans. Selama channel belum tersedia:

1. Pengguna membuat pesanan dari dialog paket (status `pending`).
2. Pengguna melakukan transfer manual sesuai instruksi admin.
3. Admin membuka panel pembayaran, mencocokkan **order ID dan nominal**, lalu
   menandai `paid`.
4. Sistem mengaktifkan/memperpanjang Premium dan mengirim notifikasi.
5. Untuk pembatalan: gunakan aksi batalkan. Untuk pengembalian dana: catat
   status `refunded`; Premium tidak dicabut otomatis, cabut manual bila perlu.

Jangan menandai `paid` tanpa bukti transfer yang cocok nominalnya.

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
