# Panduan Pembayaran Premium (Midtrans / Xendit)

Integrasi pembayaran sudah tersedia, tetapi **nonaktif sampai kredensial diisi**.
Selama belum dikonfigurasi:

- Tombol upgrade menampilkan "Pembayaran otomatis belum dikonfigurasi".
- Pengguna diarahkan menghubungi admin (`admin1@moedatrace.com`).
- Admin tetap bisa mengaktifkan Premium manual di **Admin → Paket & Pembayaran**.

## Variabel environment

| Variabel | Wajib | Keterangan |
|---|---|---|
| `PAYMENT_PROVIDER` | tidak | `midtrans` atau `xendit`. Kosong = deteksi otomatis dari kredensial. |
| `PAYMENT_PREMIUM_PRICE_IDR` | tidak | Harga langganan. Default `19000`. |
| `PAYMENT_PREMIUM_DAYS` | tidak | Durasi per transaksi. Default `30`. |
| `NEXT_PUBLIC_APP_URL` | tidak | URL publik untuk redirect & webhook. Default memakai `NEXTAUTH_URL`. |

### Midtrans

| Variabel | Keterangan |
|---|---|
| `MIDTRANS_SERVER_KEY` | Server Key dari dashboard Midtrans. **Jangan** diekspos ke client. |
| `MIDTRANS_CLIENT_KEY` | Client Key (opsional untuk alur redirect Snap). |
| `MIDTRANS_IS_PRODUCTION` | `true` untuk produksi. Kosong/`false` = sandbox. |
| `MIDTRANS_SNAP_URL` | Opsional, override endpoint Snap. |

1. Daftar di <https://dashboard.midtrans.com> → ambil **Server Key** di *Settings → Access Keys*.
2. Isi environment di Vercel (Production/Preview) atau `.env` lokal.
3. Daftarkan **Payment Notification URL**:
   `https://<domain-anda>/api/billing/webhook/midtrans`
4. Sandbox: gunakan simulator di dashboard untuk mengirim status `settlement`,
   `pending`, `expire`, dan `deny`.

Signature webhook diverifikasi dengan:
`SHA512(order_id + status_code + gross_amount + server_key)`.

### Xendit

| Variabel | Keterangan |
|---|---|
| `XENDIT_SECRET_KEY` | Secret API key (`xnd_development_...` / `xnd_production_...`). |
| `XENDIT_CALLBACK_TOKEN` | Verification token untuk webhook. |
| `XENDIT_INVOICE_URL` | Opsional, override endpoint (`https://api.xendit.co`). |

1. Daftar di <https://dashboard.xendit.co> → *Settings → API Keys*.
2. Isi `XENDIT_SECRET_KEY` dan `XENDIT_CALLBACK_TOKEN`.
3. Daftarkan **Invoice callback**:
   `https://<domain-anda>/api/billing/webhook/xendit`
4. Webhook ditolak (401) bila header `x-callback-token` tidak cocok.

## Alur transaksi

1. Pengguna klik **Upgrade Sekarang** di dialog paket.
2. `POST /api/billing/checkout` membuat baris `Payment` (`pending`) dan transaksi
   di gateway.
3. Pengguna diarahkan ke halaman pembayaran gateway.
4. Gateway mengirim webhook → signature/token diverifikasi → status `Payment`
   menjadi `paid` → `User.plan = premium` dan `planExpiresAt` diperpanjang.
5. Pengguna kembali ke `/?billing=finish`; badge paket & kuota AI diperbarui.

Aktivasi bersifat **idempoten**: webhook berulang tidak menambah masa aktif dua kali.

## Konfirmasi manual

Jika gateway belum aktif atau pengguna membayar lewat transfer:

1. Buka **Admin → Paket & Pembayaran**.
2. Cari pengguna, pilih durasi (30/90/365 hari), klik **Premium**.
3. Atau, untuk transaksi `pending` yang sudah dibuat, klik ikon centang
   **Tandai lunas** pada daftar pembayaran.

## Endpoint

| Metode | Endpoint | Akses |
|---|---|---|
| `GET` | `/api/billing/config` | pengguna login |
| `POST` | `/api/billing/checkout` | pengguna login |
| `GET` | `/api/billing/payments` | pengguna login |
| `POST` | `/api/billing/webhook/midtrans` | publik + signature |
| `POST` | `/api/billing/webhook/xendit` | publik + callback token |
| `GET` | `/api/admin/users` | admin |
| `PATCH` | `/api/admin/users/:id/plan` | admin |
| `GET` | `/api/admin/payments` | admin |
| `PATCH` | `/api/admin/payments/:id` | admin |

## Catatan keamanan

- Jangan commit `.env`; hanya `.env.example` yang berisi placeholder.
- Server key hanya dipakai di server (`src/lib/billing.ts`).
- Selalu verifikasi signature Midtrans / token Xendit sebelum mengubah paket.
- Nominal pembayaran dicocokkan dengan nominal tagihan sebelum aktivasi.
