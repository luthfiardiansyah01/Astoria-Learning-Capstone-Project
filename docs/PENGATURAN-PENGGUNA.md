# Pengaturan Pengguna

Halaman: `/akun` (judul "Akun & Pengaturan").
Status: selesai dan teruji lokal per 19 November 2026.

## 1. Fitur

| Bagian | Isi | Perilaku |
|---|---|---|
| Profil | Nama tampilan, email | Nama dapat diubah; email hanya baca |
| Tampilan | Tema: ikuti sistem, terang, gelap | Diterapkan langsung dan disimpan di server + localStorage |
| Ukuran teks | Kecil (90%), Normal (100%), Besar (112%), Sangat besar (125%) | Pratinjau langsung; memakai persentase agar tetap menghormati zoom peramban |
| Aksesibilitas | Kurangi animasi | Menonaktifkan animasi/transisi lewat `data-reduce-motion` |
| Notifikasi | Email pengingat tenggat | Cron `/api/cron/reminders` melewati email bila dimatikan |

Preferensi disimpan per akun sehingga konsisten lintas perangkat. Untuk mencegah
kedipan tema saat memuat halaman, root layout menjalankan skrip kecil yang
membaca localStorage sebelum React hidrasi.

## 2. Model data

Tiga kolom baru pada `User` (migrasi `20261119060000_user_settings`):

```prisma
theme          String  @default("system") // system | light | dark
fontScale      String  @default("normal") // small | normal | large | xlarge
reducedMotion  Boolean @default(false)
emailReminders Boolean @default(true)
```

Migrasi: `20261119060000_user_settings` dan `20261119070000_user_font_scale`.

## 3. API

| Metode | Rute | Keterangan |
|---|---|---|
| GET | `/api/profile/settings` | Mengembalikan nama, email, tema, gerak minimal, pengingat email |
| PATCH | `/api/profile/settings` | Memperbarui satu atau beberapa field |

Validasi memakai `profileSettingsSchema` di `src/lib/validation.ts`:
nama 1–80 karakter, tema hanya `system/light/dark`, boolean untuk dua toggle.

Perubahan nama juga memperbarui sesi NextAuth melalui `useSession().update()` dan
callback `jwt` dengan `trigger === "update"`.

## 4. Integrasi

- `src/components/astoria/account-settings.tsx`: formulir pengaturan.
- `src/lib/preferences.ts`: penerapan tema dan gerak minimal + skrip awal.
- `src/components/providers/preferences-provider.tsx`: sinkronisasi dari server
  dan mengikuti perubahan tema sistem.
- `src/app/api/cron/reminders/route.ts`: menghormati `emailReminders`.

## 5. Pengujian

- Integrasi: `tests/integration/settings.test.ts` (6 kasus).
- E2E: `tests/e2e/settings.spec.ts` (tema, gerak minimal, ukuran teks, dan
  responsivitas 125% pada 375 px).
- E2E menu: `tests/e2e/all-menus.spec.ts` (semua menu utama, menu mobile, admin).
- Audit axe-core: `/akun` tetap 0 pelanggaran.

Catatan: suite E2E memakai `RATE_LIMIT_DISABLED=true` agar banyak login dalam
satu proses tidak terkena batas 10 login/15 menit. Flag ini tidak boleh
diaktifkan di produksi.
