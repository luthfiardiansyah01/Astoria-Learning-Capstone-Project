# Setup Verifikasi Email & CAPTCHA

**Status: aktif di produksi sejak 7 November 2026.**

Fitur ini mengaktifkan:

- verifikasi email sebelum trial Premium 7 hari diberikan,
- blokir fitur AI untuk akun yang belum verifikasi,
- CAPTCHA Cloudflare Turnstile pada form registrasi,
- kirim ulang tautan verifikasi dari banner beranda.

Kode sudah terpasang. Aktivasi produksi membutuhkan **Resend** dan **Cloudflare
Turnstile** (keduanya punya tier gratis).

## 1. Resend (pengirim email)

1. Buat akun di https://resend.com.
2. Buka **Domains** → **Add Domain** → masukkan `moedatrace.com`.
3. Tambahkan record DNS (SPF, DKIM, dan bila diminta DMARC) yang ditampilkan
   Resend ke pengaturan DNS domain. Tunggu status **Verified**.
4. Buka **API Keys** → **Create API Key**.
   - Nama: `SOBAT ADI production`
   - Permission: **Sending access**
   - Domain: `moedatrace.com`
5. Simpan key (`re_...`) di password manager. Jangan commit ke repo.

Setelah domain terverifikasi, uji pengiriman dari dashboard Resend ke email
Anda sendiri.

## 2. Cloudflare Turnstile (CAPTCHA)

1. Buka https://dash.cloudflare.com → **Turnstile** → **Add Site**.
2. Nama: `SOBAT ADI`.
3. Domain:
   - `astoria-learning-capstone-project.vercel.app`
   - `localhost` (untuk development)
4. Widget mode: **Managed**.
5. Salin **Site Key** (publik) dan **Secret Key** (rahasia).

## 3. Environment Vercel

Tambahkan di Vercel → Project → Settings → Environment Variables →
**Production**:

| Nama | Nilai | Tipe |
|---|---|---|
| `RESEND_API_KEY` | `re_...` | Secret |
| `EMAIL_FROM` | `SOBAT ADI <no-reply@moedatrace.com>` | Config |
| `NEXT_PUBLIC_TURNSTILE_SITE_KEY` | site key Turnstile | Config (publik) |
| `TURNSTILE_SECRET_KEY` | secret key Turnstile | Secret |
| `EMAIL_VERIFICATION_ENABLED` | `true` | Config |

Untuk lokal, isi variabel yang sama di `.env` (jangan commit).

### Otomatis via script

Simpan tiga kunci ke file lokal (satu baris, tanpa tanda kutip):

```text
C:\Users\AsusV16\AppData\Local\Temp\opencode\resend-api-key.txt
C:\Users\AsusV16\AppData\Local\Temp\opencode\turnstile-site-key.txt
C:\Users\AsusV16\AppData\Local\Temp\opencode\turnstile-secret-key.txt
```

Lalu jalankan:

```powershell
powershell -ExecutionPolicy Bypass -File scripts/setup-email-verification.ps1 -Deploy -Cleanup
```

Script menulis env ke Vercel Production, menyalakan
`EMAIL_VERIFICATION_ENABLED`, mendeploy, lalu menghapus file kunci lokal.

> `NEXT_PUBLIC_` memang terlihat di browser; itu normal untuk site key.
> `RESEND_API_KEY` dan `TURNSTILE_SECRET_KEY` tidak boleh memakai prefix
> `NEXT_PUBLIC_`.

## 4. Deploy dan verifikasi

1. Redeploy production (env baru butuh deployment baru).
2. Daftar akun baru.
   - Harus menerima email verifikasi.
   - Akun sementara berstatus **Free**, belum dapat trial.
3. Buka tautan verifikasi.
   - Harus muncul “Email terverifikasi. Trial Premium 7 hari sudah aktif.”
   - `planExpiresAt` bertambah 7 hari.
4. Sebelum verifikasi:
   - Banner kuning muncul di beranda.
   - Klaim trial manual dan fitur AI harus ditolak dengan kode
     `email_unverified`.
5. CAPTCHA:
   - Widget Turnstile muncul di form registrasi.
   - Registrasi tanpa token harus gagal.
6. Kirim ulang:
   - Tombol **Kirim ulang email** di banner berfungsi.
   - Dibatasi 3 kali per jam per akun.

## 5. Checklist email deliverability

- [ ] Domain `moedatrace.com` status **Verified** di Resend.
- [ ] SPF dan DKIM terpasang.
- [ ] DMARC minimal `p=none` (opsional tetapi disarankan).
- [ ] `EMAIL_FROM` memakai domain yang terverifikasi.
- [ ] Uji ke Gmail dan Outlook; cek folder spam.
- [ ] Resend free tier cukup untuk 100 email/hari.

## 6. Rollback

Bila email bermasalah:

1. Set `EMAIL_VERIFICATION_ENABLED=false`.
2. Redeploy.

Efeknya:

- Registrasi kembali memberi trial langsung (perilaku lama).
- Pemeriksaan verifikasi pada AI dan klaim trial manual dilewati.
- Akun yang sudah terlanjur dibuat tanpa verifikasi tetap Free; verifikasi
  manual bisa diberikan lewat panel admin bila diperlukan.

Jangan menghapus `RESEND_API_KEY` saat flag masih `true`: registrasi akan
mengembalikan `503` agar tidak membuat akun yang tidak bisa diverifikasi.

## 7. Keamanan

- Token verifikasi disimpan sebagai hash SHA-256, berlaku 24 jam, sekali pakai.
- Tautan verifikasi memakai HTTPS domain produksi.
- Jangan pernah menulis API key di chat, issue, atau commit.
- Rotasi `RESEND_API_KEY` bila diduga bocor.
- Turnstile secret hanya dipakai server-side.
