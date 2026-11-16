# Kebijakan Privasi SOBAT ADI

**Versi:** 1.0
**Tanggal berlaku:** 16 November 2026
**Kontak:** admin1@moedatrace.com

Dokumen ini menjelaskan data apa yang dikumpulkan SOBAT ADI, mengapa data tersebut
diproses, siapa yang memproses, berapa lama disimpan, dan hak pengguna atas data
pribadinya. Dokumen ini melengkapi Syarat dan Ketentuan serta Kebijakan Produk.

> Dokumen ini bukan nasihat hukum. Sebelum dipakai untuk transaksi komersial
> skala luas, mintalah peninjauan penasihat hukum dan lengkapi identitas badan
> usaha penyelenggara.

## 1. Ruang lingkup

Kebijakan ini berlaku untuk situs publik, aplikasi web, Mentor AI, unggahan
dokumen, kuis, dan fitur kolaborasi tim. Dengan menggunakan Layanan, pengguna
menyetujui pemrosesan data sebagaimana dijelaskan di sini.

## 2. Data yang dikumpulkan

- **Data akun:** nama, email, kata sandi ter-hash, status verifikasi email, paket,
  masa aktif, dan waktu trial.
- **Konten pengguna:** dokumen PDF/TXT, teks hasil ekstraksi, potongan materi,
  pertanyaan, jawaban, dan catatan.
- **Aktivitas belajar:** riwayat chat, jawaban kuis, XP, lencana, serta data tim
  seperti proyek, tugas, dan komentar.
- **Data pembayaran:** nomor pesanan, nominal, status, dan waktu transaksi.
  Nomor kartu, CVV, dan PIN **tidak** disimpan.
- **Data teknis:** alamat IP, jenis peramban, waktu akses, dan log keamanan.

## 3. Dasar dan tujuan pemrosesan

1. Menyediakan dan memelihara akun serta fitur Layanan.
2. Menjalankan fitur AI, termasuk pencocokan pertanyaan dengan isi dokumen.
3. Memproses pembayaran dan mengaktifkan Premium.
4. Mengirim email transaksional (verifikasi akun, pemberitahuan paket).
5. Mencegah penipuan, spam, dan penyalahgunaan kuota.
6. Memenuhi kewajiban hukum, termasuk pencatatan transaksi.

Dasar pemrosesan: pelaksanaan perjanjian layanan, persetujuan pada fitur
tertentu, kepentingan sah untuk keamanan, dan kewajiban hukum.

## 4. Dokumen dan fitur AI

Saat dokumen diunggah, sistem mengekstrak teks, memecahnya menjadi bagian kecil,
dan membuat representasi vektor untuk pencarian. Isi dokumen dan pertanyaan dapat
dikirim ke penyedia model bahasa pihak ketiga untuk menghasilkan jawaban.

Dokumen hanya dapat diakses pemilik, anggota tim yang berhak, dan admin untuk
moderasi. Pengguna disarankan tidak mengunggah data pribadi sensitif yang tidak
diperlukan untuk belajar.

## 5. Pembayaran

Pembayaran diproses oleh gateway pihak ketiga pada halaman mereka. SOBAT ADI
hanya menerima status transaksi yang diperlukan untuk mengaktifkan paket. Untuk
audit dan pengembalian dana, sistem menyimpan nomor pesanan, nominal, status, dan
waktu transaksi.

## 6. Pemroses pihak ketiga

| Penyedia | Peran |
|---|---|
| Vercel | Hosting aplikasi dan log teknis |
| Supabase | Basis data PostgreSQL dan data aplikasi |
| Upstash | Pembatasan laju berbasis Redis |
| Penyedia model AI | Pemrosesan teks untuk jawaban, kuis, pencarian semantik |
| Resend | Email verifikasi dan pemberitahuan |
| Cloudflare Turnstile | Verifikasi manusia saat pendaftaran |
| Midtrans / Xendit | Pemrosesan pembayaran |

Sebagian penyedia beroperasi di luar Indonesia. Data pribadi tidak dijual kepada
pihak lain.

## 7. Penyimpanan dan retensi

- Data akun disimpan selama akun aktif atau sampai diminta dihapus.
- Dokumen dan chat disimpan sampai dihapus pengguna atau akun dihapus.
- Catatan pembayaran disimpan lebih lama untuk audit, pajak, dan sengketa.
- Log teknis disimpan terbatas sesuai kebutuhan operasional.

Setelah masa simpan berakhir, data dihapus atau dianonimkan sejauh memungkinkan.

## 8. Hak pengguna

- Meminta akses dan salinan data pribadi.
- Meminta koreksi data yang tidak akurat.
- Meminta penghapusan, dengan catatan kewajiban hukum tertentu.
- Menarik persetujuan untuk pemrosesan berbasis persetujuan.
- Mengajukan keberatan dan pembatasan pemrosesan.
- Mengajukan keluhan kepada otoritas perlindungan data yang berwenang.

Permintaan dikirim ke admin1@moedatrace.com. Identitas pemohon diverifikasi
sebelum permintaan diproses.

## 9. Cookie dan penyimpanan lokal

Cookie sesi diperlukan untuk status login. Preferensi tampilan dan sesi kuis
disimpan di penyimpanan lokal peramban. Tidak ada cookie iklan atau pelacak
pemasaran pihak ketiga.

## 10. Keamanan

Kontrol yang diterapkan: kata sandi ter-hash, sesi bertanda tangan, pembatasan
laju, kontrol akses per peran, dan pembatasan akses basis data. Tidak ada sistem
yang sepenuhnya bebas risiko; pelanggaran data yang berdampak akan diberitahukan
sesuai ketentuan yang berlaku.

## 11. Usia pengguna

Layanan ditujukan untuk pengguna berusia minimal 17 tahun, atau lebih muda dengan
izin wali yang sah.

## 12. Perubahan kebijakan

Perubahan material diberitahukan melalui aplikasi atau email. Tanggal berlaku
terbaru tercantum di bagian atas dokumen dan halaman publik.

## 13. Kontak

Pertanyaan, permintaan data, atau keluhan: **admin1@moedatrace.com**.
