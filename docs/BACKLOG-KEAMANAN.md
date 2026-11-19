# Backlog Keamanan Sesi dan Akun

Status: **belum dikerjakan**, disimpan untuk penerapan berikutnya.
Tanggal dicatat: 19 November 2026.

## Kondisi saat ini

Sudah berjalan:

- Satu akun satu sesi aktif.
- Device ID per peramban.
- Peringatan di perangkat lama dan email login baru.
- Verifikasi ulang password untuk siaran admin.
- Audit log siaran dan batas 3 siaran per 10 menit.

## 1. Autentikasi dua faktor (2FA)

**Prioritas:** tinggi
**Tujuan:** mengurangi risiko pencurian password dan token.

Ruang lingkup:

- OTP email untuk semua pengguna, atau TOTP untuk admin.
- Kode berlaku 5 sampai 10 menit, sekali pakai.
- Opsi "ingat perangkat ini 30 hari" dengan device ID.
- Kode pemulihan untuk admin.

Kriteria selesai:

- Login meminta faktor kedua setelah password benar.
- Kode salah dibatasi laju.
- Ada halaman pengaturan 2FA di `/akun`.
- Tes integrasi untuk kode benar, salah, kedaluwarsa, dan percobaan berulang.

## 2. Kelola sesi dan perangkat

**Prioritas:** tinggi
**Tujuan:** pengguna dapat melihat dan mencabut sesi sendiri.

Ruang lingkup:

- Tabel `Session` atau riwayat login: perangkat, waktu, lokasi kasar, sesi aktif.
- Halaman `/akun` menampilkan "Perangkat dan sesi".
- Tombol "Akhiri sesi ini" dan "Akhiri semua sesi lain".
- Sesi dicabut dengan mengganti `activeSessionId` atau status `revokedAt`.

Kriteria selesai:

- Pengguna melihat sesi aktif saat ini.
- Mencabut sesi lain membuat token terkait tidak valid pada pemeriksaan berikutnya.
- Riwayat login disimpan terbatas, misalnya 90 hari.

## 3. Verifikasi ulang untuk semua aksi admin

**Prioritas:** tinggi
**Tujuan:** sesi admin yang dicuri tidak cukup untuk mengubah data.

Aksi yang perlu password ulang:

- Konfirmasi pembayaran manual.
- Refund dan pembatalan pesanan.
- Perubahan paket pengguna.
- Moderasi dokumen.
- Penghapusan dokumen.
- Siaran notifikasi (sudah).

Kriteria selesai:

- Endpoint menerima `password` dan memverifikasi ulang.
- Password salah menghasilkan 403 tanpa perubahan data.
- Semua aksi tetap tercatat di `AdminAuditLog`.
- UI menampilkan dialog verifikasi sebelum aksi.

## 4. Masa berlaku sesi dan rotasi token

**Prioritas:** sedang
**Tujuan:** mengurangi jendela penyalahgunaan token.

Ruang lingkup:

- Turunkan `maxAge` sesi, misalnya 7 hari.
- Idle timeout, misalnya 8 jam tanpa aktivitas.
- Rotasi `sessionId` setelah login ulang atau perubahan password.
- Cabut semua sesi setelah reset password.

Kriteria selesai:

- Token kedaluwarsa sesuai konfigurasi.
- Reset password mengakhiri sesi lain.
- Ada pesan yang jelas saat sesi berakhir.

## 5. Pemantauan konflik sesi

**Prioritas:** sedang
**Tujuan:** mendeteksi indikasi sharing akun atau akses mencurigakan.

Ruang lingkup:

- Gunakan `sessionConflictCount` dan `sessionConflictAt`.
- Dasbor admin: daftar akun dengan konflik berulang.
- Ambang peringatan, misalnya 5 konflik dalam 24 jam.
- Notifikasi ke admin, bukan hanya ke pengguna.
- Opsi tindakan: kirim email peringatan atau nonaktifkan sementara.

Kriteria selesai:

- Admin dapat melihat akun dengan konflik tinggi.
- Ambang dapat diubah lewat konfigurasi.
- Tindakan admin tercatat di audit log.

## Catatan penerapan

- Kerjakan berurutan: 2FA, kelola sesi, verifikasi admin, masa sesi, pemantauan.
- Setiap perubahan skema harus aditif dan punya jalur mundur.
- Jangan mengikat sesi ke IP karena alamat IP mudah berubah dan tidak mewakili perangkat.
- Perbarui `docs/SESI-TUNGGAL.md` dan `docs/NOTIFIKASI.md` saat item terkait selesai.
