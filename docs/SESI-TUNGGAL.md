# Satu Akun Satu Sesi

Fitur ini membatasi satu akun hanya pada satu sesi aktif. Login baru mengakhiri
sesi lama dan perangkat lama menerima peringatan.

## 1. Aturan

- Setiap login berhasil membuat `sessionId` acak.
- `sessionId` disimpan pada `User.activeSessionId` dan di token JWT.
- Jika akun yang sama login lagi, `activeSessionId` diganti.
- Token lama tidak lagi cocok, sehingga:

  - API menolak dengan 401,
  - halaman menampilkan peringatan,
  - pengguna diarahkan masuk kembali.

## 2. Peringatan

Komponen `SessionGuard` memeriksa `/api/session/status`:

- saat halaman dimuat,
- setiap 30 detik,
- saat tab kembali fokus atau terlihat,
- saat event `sobat:session-check` dipicu.

Jika sesi tidak valid, muncul dialog:

> Akun ini aktif di perangkat lain
> Demi keamanan, satu akun hanya dapat digunakan pada satu perangkat. Sesi di
> perangkat ini telah diakhiri karena akun yang sama baru saja masuk di
> perangkat lain.

Tombol **Masuk lagi** mengakhiri sesi lokal dan membuka halaman login dengan
pesan `reason=sesi-berakhir`.

## 3. Data

Kolom baru pada `User`:

```prisma
activeSessionId      String?
activeSessionAt      DateTime?
activeDevice         String?
sessionConflictCount Int      @default(0)
sessionConflictAt    DateTime?
```

Migrasi: `20261119090000_single_session`.

`sessionConflictCount` bertambah setiap login menggantikan sesi lain, berguna
untuk pemantauan indikasi sharing akun.

## 4. Kompatibilitas

Token lama yang belum memiliki `sessionId` tetap diterima selama
`activeSessionId` masih kosong. Setelah pengguna login kembali, token lama
otomatis tidak berlaku.

## 5. Batasan

- Fitur ini mencegah dua sesi login aktif, bukan menyalin cookie secara fisik.
  Jika token disalin ke perangkat lain, keduanya memakai `sessionId` yang sama
  sampai salah satu login ulang.
- Perangkat lama baru menampilkan peringatan pada pemeriksaan berikutnya
  (maksimal 30 detik) atau saat tab kembali aktif.
- Pengguna yang sering berganti perangkat akan sering diminta login ulang.

## 6. Pengujian

- E2E `tests/e2e/single-session.spec.ts`: login di konteks kedua membuat sesi
  pertama tidak valid, dialog peringatan muncul, dan API mengembalikan 401.
- Seluruh suite: 158 unit, 176 integrasi, 23 E2E.
