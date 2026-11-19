# Audit Aksesibilitas

Tanggal: 19 November 2026
Standar acuan: WCAG 2.2 Level A dan AA
Alat: axe-core 4.14 melalui `@axe-core/playwright`

## 1. Cakupan

Halaman yang dipindai:

1. Login
2. Beranda (desktop 1280 px)
3. Beranda (mobile 375 px)
4. Mentor AI
5. Unggah
6. Kuis
7. Collab
8. Akun
9. Pernyataan Aksesibilitas
10. Kebijakan Privasi

Tag yang diuji: `wcag2a`, `wcag2aa`, `wcag21a`, `wcag21aa`, `wcag22aa`.

## 2. Hasil sebelum perbaikan

| Halaman | Temuan |
|---|---|
| Beranda desktop | 3 jenis, 9 node |
| Beranda mobile | 2 jenis, 6 node |
| Mentor AI | 4 jenis, 5 node |
| Unggah | 4 jenis, 5 node |
| Kuis | 4 jenis, 5 node |
| Login, Collab, Akun | 0 |

Jenis pelanggaran:

1. `aria-progressbar-name`: komponen progres tanpa nama aksesibel.
2. `color-contrast`: teks kecil di bawah rasio 4,5:1.
3. `aria-prohibited-attr`: `aria-label` pada `div` tanpa role.
4. `label-content-name-mismatch`: nama aksesibel tidak memuat teks yang terlihat.

## 3. Perbaikan

- Menambahkan `aria-label` pada seluruh komponen progres: XP header, XP beranda,
  skor kuis, distribusi tugas, kontribusi anggota, dan progres tim.
- `ViewSkeleton` diberi `role="status"` agar `aria-label` valid.
- Kontras diperbaiki:
  - tagline logo dari `text-primary/75` menjadi `text-muted-foreground`;
  - badge kuota AI memakai `text-emerald-800`;
  - kartu lencana terkunci tidak lagi memakai `opacity-70`.
- Tombol logo memakai teks tersembunyi "Kembali ke beranda" dan teks terlihat
  sebagai nama aksesibel, sehingga aturan label-content terpenuhi.
- Tautan footer diberi tinggi minimum 24 px agar memenuhi aturan target-size
  WCAG 2.2 pada layar kecil.

## 4. Hasil sesudah perbaikan

| Halaman | Pelanggaran |
|---|---|
| Login | 0 |
| Beranda desktop | 0 |
| Beranda mobile 375 px | 0 |
| Mentor AI | 0 |
| Unggah | 0 |
| Kuis | 0 |
| Collab | 0 |
| Akun | 0 |
| Pernyataan Aksesibilitas | 0 |
| Kebijakan Privasi | 0 |

Total: **0 pelanggaran** pada 10 halaman yang diuji.

Laporan mentah: `docs/a11y-audit.json`.

## 5. Uji TalkBack

Perangkat: motorola edge 60 pro (Android), TalkBack bawaan Google, Chrome.

Yang berhasil diverifikasi:

- TalkBack aktif dan membaca konten halaman.
- Hierarki aksesibilitas mengekspos elemen penting:
  - judul "Masuk ke SOBAT ADI";
  - tombol "Masuk";
  - tautan "Lupa password?", "Daftar", "Pelajari paket & harga";
  - tautan "Syarat & Ketentuan" dan "Kebijakan Produk".
- Nama aksesibel kolom Email dan Password diverifikasi lewat perhitungan nama
  browser (`getByLabel("Email")`, `getByLabel("Password")`).

Yang belum tuntas:

- Penelusuran fokus otomatis lewat ADB tidak reliabel karena TalkBack membuka
  tutorial 7 halaman dan mengintersepsi gesture.
- Kolom `EditText` tidak menampilkan nama pada dump `uiautomator`; ini
  keterbatasan jembatan Android, bukan bukti label hilang, karena nama browser
  sudah diverifikasi.
- Uji dengan pembaca layar lain (NVDA) dan pengguna disabilitas nyata belum
  dilakukan.

Setelan perangkat dipulihkan setelah pengujian:
`accessibility_enabled=0`, `enabled_accessibility_services=null`.

## 6. Batasan

- axe-core hanya mendeteksi sebagian masalah (biasanya sekitar 30–50%).
  Kepatuhan penuh tetap memerlukan uji manual.
- Belum diuji: zoom 200%, mode kontras tinggi, dan alur pembayaran.
- Belum ada uji dengan pengguna disabilitas.

## 7. Cara menjalankan ulang

```bash
bun run build
bunx playwright test tests/e2e/a11y-audit.spec.ts
```

Laporan ditulis ulang ke `docs/a11y-audit.json`.
