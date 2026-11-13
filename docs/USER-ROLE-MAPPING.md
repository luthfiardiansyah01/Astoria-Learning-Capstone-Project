# Pemetaan User & Role — SOBAT ADI

Dokumen ini memetakan jenis pengguna, role, paket, dan hak aksesnya di aplikasi.
Terakhir diperbarui: 13 November 2026.

## Ringkasan data produksi

| Kategori | Jumlah |
|---|---:|
| Total user | 23 |
| Role `mahasiswa` | 21 |
| Role `admin` | 2 |
| Plan `premium` (aktif/trial) | 19 |
| Plan `free` | 4 |
| Email terverifikasi | 23 |
| TeamMember | 5 |
| Team owner | 4 |
| Team member biasa | 1 |

Catatan: angka dapat berubah saat ada pendaftaran, trial, atau pembayaran baru.

## 1. Role utama

| Role | Siapa | Akses |
|---|---|---|
| **Guest** (belum login) | Pengunjung | `/login`, `/register`, `/produk`, halaman legal; API terlindungi → **401** |
| **Mahasiswa** | Pengguna terdaftar | Fitur belajar sesuai plan; tim/proyek/tugas sesuai keanggotaan |
| **Admin** | Pengelola platform | Semua fitur mahasiswa + moderasi dokumen, user, pembayaran, analitik seluruh tim. Akses Kanban tim tetap memerlukan keanggotaan tim. |

### Admin

- `role = "admin"` di database.
- Selalu dianggap **Premium** oleh `effectivePlan()`.
- Bisa mengakses seluruh route `/api/admin/*`.
- Bisa memoderasi dokumen (`approved`/`pending`/`rejected`).
- Bisa mengubah plan user dan menandai pembayaran manual/refund.
- Bisa melihat analitik semua tim.
- Tidak bisa diundang menjadi anggota tim biasa.
- Untuk route Kanban/proyek/tugas, admin tetap harus menjadi anggota tim
  (kecuali route admin khusus).
- Pemeriksaan verifikasi email untuk AI dilewati untuk admin.

### Mahasiswa

- `role = "mahasiswa"` (default registrasi).
- Harus login untuk mengakses aplikasi utama.
- Harus verifikasi email sebelum memakai AI dan sebelum trial Premium aktif.
- Bisa membuat tim (batas sesuai plan) dan menjadi owner.
- Bisa diundang ke tim orang lain; baru aktif setelah menerima undangan.

## 2. Pemetaan plan

| Plan | Cara diperoleh | Batas utama |
|---|---|---|
| **Free** | Default setelah verifikasi; atau Premium kedaluwarsa | AI 30/hari, 5/menit; dokumen 8.000 karakter; PDF 2 MB; 1 tim, 2 proyek, 10 tugas; 3 anggota |
| **Premium** | Trial 7 hari setelah verifikasi email, atau pembayaran Rp19.000/30 hari, atau aktivasi admin | AI 300/hari, 20/menit; dokumen 20.000 karakter; PDF 5 MB; 10 tim, 10 proyek, 100 tugas; 30 anggota |
| **Admin** | Role admin | Selalu Premium |

Aturan `effectivePlan()`:

1. `role = admin` → **premium**.
2. `plan != premium` → **free**.
3. `plan = premium` dan `planExpiresAt` kosong → **premium tanpa batas**.
4. `plan = premium` dan `planExpiresAt` masih future → **premium**.
5. `plan = premium` dan `planExpiresAt` sudah lewat → **free**.

Trial:

- Diberikan setelah email terverifikasi (bukan saat registrasi mentah).
- `trialUsedAt` mencegah trial kedua.
- Kuota AI tetap mengikuti batas Premium selama trial.

## 3. Role di dalam tim

| Role tim | Cara mendapat | Hak |
|---|---|---|
| **Owner** | Pembuat tim | Ganti nama/hapus tim, undang/batalkan undangan, keluarkan anggota, hapus proyek |
| **Member** | Menerima undangan | Lihat tim/proyek, buat/ubah tugas, hapus tugas, buat/ubah proyek, pakai Mentor AI |
| **Invited** (pending) | Diundang owner | Belum punya akses; hanya bisa menerima/menolak undangan |
| **Bukan anggota** | Tidak terdaftar di tim | Ditolak **403** pada route tim/proyek/tugas |

Catatan:

- Batas proyek/tugas/anggota mengikuti **plan owner tim**, bukan plan anggota.
- Owner tidak bisa dikeluarkan dari tim.
- Undangan pending dihitung terhadap batas anggota sampai diterima/ditolak/dibatalkan.
- Admin tidak bisa diundang ke tim.

## 4. Matriks akses fitur

| Fitur | Guest | Mahasiswa Free | Mahasiswa Premium | Admin |
|---|---|---|---|---|
| Landing produk `/produk` | ✅ | ✅ | ✅ | ✅ |
| Login/register | ✅ | — | — | — |
| Beranda | ❌ | ✅ | ✅ | ✅ |
| Mentor AI / chat | ❌ | ✅ (kuota Free) | ✅ (kuota Premium) | ✅ |
| Unggah dokumen | ❌ | ✅ (8.000 char) | ✅ (20.000 char) | ✅ |
| Kuis | ❌ | ✅ | ✅ | ✅ |
| Tim/proyek/tugas | ❌ | ✅ (batas Free) | ✅ (batas Premium) | ✅ (jika anggota tim) |
| Undangan tim | ❌ | ✅ | ✅ | ✅ |
| Moderasi dokumen | ❌ | ❌ | ❌ | ✅ |
| Kelola user & pembayaran | ❌ | ❌ | ❌ | ✅ |
| Analitik semua tim | ❌ | ❌ | ❌ | ✅ |

## 5. Kepemilikan data

| Data | Aturan akses |
|---|---|
| Dokumen | Pemilik, admin, atau dokumen `approved` untuk pengguna lain |
| Chat | Selalu difilter `userId` pemilik |
| Kuis/attempt | Selalu `userId` pemilik |
| Pembayaran | Pemilik pesanan; admin bisa melihat semua |
| Notifikasi | `userId` penerima |
| Tim/proyek/tugas | Harus anggota tim; aksi tertentu owner/admin |
| Tugas Mentor AI | Anggota tim + dokumen harus lolos `canUseDocument` |

## 6. Enforcement di kode

| Fungsi | Lokasi | Fungsi |
|---|---|---|
| `requireUser()` | `src/lib/current-user.ts` | Wajib login; membaca user dari DB |
| `requireAdmin()` | `src/lib/current-user.ts` | Wajib role admin |
| `effectivePlan()` | `src/lib/plans.ts` | Menentukan Free/Premium efektif |
| `guardAi()` | `src/lib/rate-limit.ts` | Kuota AI + cek verifikasi email |
| `canUseDocument()` | `src/lib/current-user.ts` | Pemilik/admin/dokumen approved |
| `canManageDocument()` | `src/lib/current-user.ts` | Pemilik/admin |
| `assertTeamMember()` | `src/lib/collab.ts` | Wajib anggota tim |
| `teamOwnerPlan()` | `src/lib/team-plan.ts` | Batas tim mengikuti plan owner |
| `settlePayment()` | `src/lib/billing.ts` | Aktivasi Premium idempoten |

## 7. Akun contoh

| Akun | Role | Plan | Kegunaan |
|---|---|---|---|
| `admin@ut.ac.id` | admin | Premium (efektif) | Operasional admin |
| `admin@sobat-adi.id` | admin | Premium (efektif) | Legacy; nonaktifkan setelah yakin |
| `free.seed@moedatrace.com` | mahasiswa | Free | Uji Plan Free |
| `review.midtrans@moedatrace.com` | mahasiswa | Free | Akun dummy review Midtrans (password hanya di PDF lokal) |

## 8. Catatan keamanan

- Jangan menulis password/token di dokumen yang di-commit.
- Akun `review.midtrans@moedatrace.com` harus dinonaktifkan setelah review Midtrans.
- Admin legacy `admin@sobat-adi.id` sebaiknya dinonaktifkan setelah admin aktif dipastikan.
- Semua route API tetap memeriksa sesi/role/kepemilikan di server, bukan hanya UI.
