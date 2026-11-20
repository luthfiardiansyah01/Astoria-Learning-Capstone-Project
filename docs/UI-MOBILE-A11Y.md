# UI Mobile dan Aksesibilitas

Dokumen ini mencatat penyempurnaan antarmuka SOBAT ADI untuk layar kecil dan
pengguna disabilitas. Perubahan bersifat UI; tidak ada perubahan skema database.

## 1. Navigasi mobile

- Di bawah 1280 px, navigasi bawah tetap (`fixed`) dengan lima tujuan:
  Beranda, Mentor AI, Unggah, Kuis, dan Lainnya.
- Pada 1280 px ke atas, navigasi pil di header ditampilkan dan navigasi bawah
  disembunyikan.
- Header memadatkan label teks di bawah 1536 px agar tidak meluber.
- "Lainnya" membuka sheet berisi Panduan aplikasi, Collab, Akun, Pernyataan
  aksesibilitas, dan Panel admin (khusus admin).
- Target sentuh minimal 56 px, di atas ambang 44 px.
- Menghormati `env(safe-area-inset-bottom)` untuk perangkat dengan home indicator.
- Konten utama dan footer diberi ruang bawah agar tidak tertutup navigasi.
- Navigasi pil horizontal lama di header hanya dipakai pada layar `lg` ke atas.

## 2. Panduan aplikasi interaktif

Komponen `AppGuide` berisi enam langkah:

1. Beranda dan progres belajar.
2. Unggah modul.
3. Mentor AI dengan rujukan.
4. Kuis otomatis.
5. Kolaborasi tim.
6. Akun, privasi, dan aksesibilitas.

Fitur panduan:

- Tombol "Panduan" di header (layar sedang ke atas) dan di sheet mobile.
- Navigasi tombol Sebelumnya/Berikutnya, tombol Lewati, dan "Buka fitur ini".
- Navigasi keyboard dengan tombol panah kiri/kanan; Escape menutup dialog.
- Fokus terperangkap di dalam dialog (Radix Dialog), judul dan deskripsi
  terhubung untuk pembaca layar.
- Pengumuman langkah melalui `aria-live`.

## 3. Aksesibilitas

| Aspek | Implementasi |
|---|---|
| Lewati navigasi | Tautan "Lewati ke konten utama" muncul saat fokus keyboard |
| Fokus | Outline 3 px dengan offset pada semua kontrol interaktif |
| Target sentuh | Minimal 44 px untuk kontrol di layar kecil |
| Gerak minimal | Animasi dan transisi dinonaktifkan saat `prefers-reduced-motion` |
| Formulir | Label eksplisit; input tanpa label visual diberi `aria-label` |
| Navigasi | `aria-current="page"` pada item aktif dan label navigasi |
| Status | `aria-live` mengumumkan perpindahan tampilan |
| Tema | `theme-color` dan manifest PWA (`display: standalone`) |
| Skip link | Target `#konten-utama` disediakan di root layout |

Input yang ditambahkan `aria-label`: pertanyaan Mentor AI, nama dokumen, isi
modul, jawaban kuis, pencarian pengguna admin, judul tugas baru, pencarian
anggota tim, dan pertanyaan mentor tugas.

## 4. Pengujian

- `tests/e2e/mobile.spec.ts`: tidak ada overflow horizontal pada 375 px.
- `tests/e2e/responsive.spec.ts`: halaman publik dan pengguna diuji pada 320,
  768, 1024, dan 1440 px; panel admin pada 1024 dan 1440 px.
- `tests/e2e/mobile-nav.spec.ts`: navigasi bawah, panduan interaktif, dan target
  sentuh minimal 44 px.
- Seluruh tes: 162 unit, 177 integrasi, 28 E2E, build, typecheck, dan lint lulus.

## 5. Batasan

- Audit axe-core sudah dijalankan: 0 pelanggaran pada 8 halaman (lihat
  `docs/A11Y-AUDIT.md`). Audit otomatis tetap hanya mencakup sebagian masalah.
- Uji TalkBack di perangkat berhasil membaca struktur halaman, tetapi
  penelusuran fokus otomatis belum tuntas dan perlu uji manual.
- Kontras sudah diperbaiki berdasarkan temuan axe, tetapi token warna baru harus
  diuji ulang.
- Panduan belum menyimpan status "sudah dilihat", jadi tidak muncul otomatis.
  Ini disengaja agar tidak menghalangi pengguna dan tes otomatis.
