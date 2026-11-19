# Notifikasi

Dokumen ini mencatat fitur notifikasi SOBAT ADI dan hasil pengujiannya.

## 1. Notifikasi dalam aplikasi

- Ikon lonceng di halaman Collab (daftar proyek, analitik, dan detail proyek).
- Badge angka untuk notifikasi belum dibaca (maksimal "9+").
- Popover berisi judul, isi, waktu, ikon per jenis, dan penanda belum dibaca.
- Tombol "Tandai semua dibaca" dan penandaan per item saat diklik.
- Daftar diperbarui otomatis setiap 30 detik.

Jenis yang dikenali: undangan tim, anggota baru, penolakan undangan, kenaikan
level tim, lencana, tenggat mendekat, dan tugas terlambat.

API:

| Metode | Rute | Fungsi |
|---|---|---|
| GET | `/api/collab/notifications` | Daftar 30 notifikasi terakhir, jumlah belum dibaca, dan pemindaian tenggat |
| POST | `/api/collab/notifications` | Tandai dibaca (`ids` opsional; tanpa ids = semua) |

## 2. Email pengingat

- Toggle di `/akun` â†’ Notifikasi â†’ "Email pengingat tenggat".
- Disimpan pada kolom `User.emailReminders`.
- Cron `/api/cron/reminders` tetap membuat notifikasi dalam aplikasi, tetapi
  melewati pengiriman email bila toggle dimatikan.

## 3. Hasil uji di Android

Perangkat: motorola edge 60 pro, Chrome, server lokal, database uji.

| Skenario | Hasil |
|---|---|
| Dua notifikasi uji dibuat | Tampil di popover |
| Badge lonceng | "2" dan label "Notifikasi, 2 belum dibaca" |
| Isi notifikasi | Judul, isi, waktu, ikon tampil |
| Tandai semua dibaca | Badge hilang, label menjadi "Notifikasi" |
| Toggle email pengingat | Berubah true â†’ false, tersimpan, bertahan setelah reload |
| Kembalikan toggle | Kembali true dan tersimpan |

## 4. Tes otomatis

- `tests/e2e/notifications.spec.ts`: menyiapkan dua notifikasi, membuka lonceng,
  memeriksa isi, lalu menandai semua dibaca.
- `tests/e2e/settings.spec.ts`: preferensi tampilan dan ukuran teks.
- `tests/integration/settings.test.ts`: validasi dan penyimpanan preferensi.

## 5. Batasan

- Pengiriman email sebenarnya belum diuji karena Resend tidak dikonfigurasi pada
  lingkungan lokal. Yang diuji adalah penyimpanan preferensi dan logika cron.
- Notifikasi push peramban/HP belum tersedia; notifikasi saat ini bersifat
  dalam aplikasi dan email.

