# Log Monitoring & Tahapan SOBAT ADI

Dokumen ini adalah catatan operasional berjalan. Setiap tahap (P0, P1, P2, …)
wajib menambahkan entri di bagian **Log Tahapan** agar keputusan, bukti
verifikasi, dan sisa risiko tidak hilang.

- **Produksi:** https://astoria-learning-capstone-project.vercel.app
- **Repo:** `luthfiardiansyah01/Astoria-Learning-Capstone-Project`
- **Runbook terkait:** `docs/OPERATIONS-RUNBOOK.md`
- **Terakhir diperbarui:** 7 November 2026

## Status ringkas

| Fase | Status | Commit terakhir | Catatan |
|---|---|---|---|
| P0 | Selesai | `322c481` | Rotasi DB, rate limit, admin, Midtrans internal |
| P1 | Belum dimulai | — | Verifikasi email, moderasi dokumen, body limit, invite |

## Checklist monitoring

### Harian

| Item | Cara cek | Ambang normal | Tindakan bila anomali |
|---|---|---|---|
| Error runtime & 5xx | `vercel logs --environment production --since 30m --non-interactive` | 0 error, 0 respons 5xx | Cek request/path, rollback bila perlu |
| Autentikasi database | Log yang sama; cari `28P01`, `P1001`, `P1017`, `password authentication failed` | Tidak ada | Cek `DATABASE_URL`/`DIRECT_URL` di Vercel, verifikasi password DB |
| Login Free | Login `free.seed@moedatrace.com` atau akun uji | HTTP 200, plan `free` | Cek Upstash/fail-closed, lalu DB |
| Login admin | Login `admin@ut.ac.id` | HTTP 200, role `admin` | Gunakan admin cadangan; jangan kunci diri sendiri |
| Upstash | Ping REST atau lihat key `sobadi:rl:*` | `PONG`, key bertambah saat login | Jika down, putuskan `RATE_LIMIT_FAIL_CLOSED=false` sementara |
| Webhook Midtrans | `GET /api/billing/webhook/midtrans` | HTTP 200 | Cek dashboard Midtrans dan log webhook |
| Rate limit 429 | Log/analytics; pantau lonjakan | Wajar hanya saat abuse | Naikkan batas per IP bila jaringan kampus bersama |

### Mingguan

| Item | Cara cek | Tindakan |
|---|---|---|
| Channel Midtrans | Dashboard Midtrans → business review/channel | Bila aktif, uji transaksi kecil end-to-end |
| Pembayaran pending | Admin → pembayaran | Cocokkan order ID + nominal; jangan tandai `paid` tanpa bukti |
| Admin legacy | Login/daftar admin | Hapus/nonaktifkan `admin@sobat-adi.id` setelah admin aktif aman |
| Backup Supabase | Dashboard → Database → Backups | Pastikan backup terbaru tersedia |
| Dependency/security | `bun audit` atau Dependabot | Perbarui patch kritis |

### Bulanan

| Item | Cara cek | Tindakan |
|---|---|---|
| Secret hygiene | `git grep` pola token; cek history | Rotasi token yang pernah terekspos |
| Supabase linter/RLS | Dashboard → Advisors | Tutup temuan baru |
| Kredensial admin | Password manager | Rotasi berkala; pastikan dua admin aktif |
| Akses Vercel/Supabase | Daftar member | Cabut akses yang tidak lagi diperlukan |

## Log tahapan

Tambahkan entri baru **di bagian paling bawah** setiap selesai satu tahap.
Jangan menulis password, token, atau isi `.env` di dokumen ini.

| Tanggal | Fase | Item | Status | Bukti/Catatan |
|---|---|---|---|---|
| 2026-11-07 | P0 | Rotasi password database | Selesai | 48 karakter; Vercel + lokal diperbarui; 19 user; login Free/admin 200; PAT dihapus |
| 2026-11-07 | P0 | Rate limit produksi | Selesai | Per-IP 60/15m; per akun 10/15m; fail-closed aktif; key Upstash terverifikasi |
| 2026-11-07 | P0 | Akun admin | Selesai | `admin@ut.ac.id` password kuat; login role `admin`; legacy admin dipertahankan |
| 2026-11-07 | P0 | Midtrans | Selesai (internal) | `configured=true`; alur manual teruji; channel menunggu business review |
| 2026-11-07 | P0 | Regresi & log | Selesai | Unit 143, integration 124, E2E 11; log 0 error/0 5xx; CI `322c481` success |
| 2026-11-07 | P0 | Sisa risiko | Terbuka | Admin legacy, fail-closed saat Upstash down, batas IP jaringan bersama, channel Midtrans |

### Detail entri P0 — 7 November 2026

**Perubahan**
- Rotasi password database melalui Supabase Management API.
- Update `DATABASE_URL` dan `DIRECT_URL` di Vercel Production, `.env`, `.env.supabase`.
- Tambah rate limit login per IP dan validasi header IP.
- Aktifkan `RATE_LIMIT_FAIL_CLOSED=true`.
- Rotasi password `admin@ut.ac.id`; token PAT dan backup rotasi dihapus.
- Dokumentasi operasional dibuat di `docs/OPERATIONS-RUNBOOK.md`.

**Verifikasi**
- Query DB dengan password baru: 19 user.
- Login Free: HTTP 200, plan `free`.
- Login admin: HTTP 200, role `admin`.
- Log produksi 30 menit: 0 error, 0 respons 5xx, tidak ada `28P01`.
- Unit 143 / integration 124 / E2E 11 lulus.
- CI `322c481` sukses; deployment Production Ready.

**Sisa risiko**
- `admin@sobat-adi.id` masih aktif (legacy).
- Fail-closed memblokir login/AI bila Upstash down.
- Batas 60 login/15 menit per IP bisa terasa ketat di NAT kampus.
- Channel pembayaran Midtrans belum aktif; alur manual tetap tersedia.
- Layanan eksternal di luar repo yang masih memakai password DB lama perlu diperbarui.

## Template entri tahap berikutnya

Salin template ini ke bagian paling bawah **Log tahapan** dan isi:

```markdown
### YYYY-MM-DD — P1 — <judul>

**Perubahan**
- ...

**Verifikasi**
- ...

**Hasil**
- ...

**Sisa risiko**
- ...

**Tindak lanjut**
- ...
```

## Perintah bantu

```powershell
# Log produksi 30 menit terakhir
vercel logs --environment production --since 30m --non-interactive

# Health check
curl.exe -s -o NUL -w "%{http_code}" https://astoria-learning-capstone-project.vercel.app/login
curl.exe -s -o NUL -w "%{http_code}" https://astoria-learning-capstone-project.vercel.app/api/billing/webhook/midtrans

# Cek key rate limit di Upstash (token dibaca dari env, tidak dicetak)
# Gunakan script internal atau dashboard Upstash; jangan pernah mencetak token.
```

## Aturan penulisan log

1. Satu entri per tahap/perubahan besar; sertakan tanggal dan fase.
2. Tulis bukti yang dapat diverifikasi (status HTTP, jumlah test, commit hash).
3. Jangan menulis password, token, API key, atau isi `.env`.
4. Redaksi email pengguna bila perlu.
5. Jika ada rollback, catat penyebab dan hasilnya.
6. Perbarui **Status ringkas** setiap kali fase berubah.
