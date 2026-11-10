# Business Supporting Document — Midtrans

Status: **koreksi dokumen / in review** (10 November 2026).

Midtrans meminta **Business Supporting Document** dan **Website** untuk empat
metode pembayaran:

- GoPay QRIS Aggregator
- Bank Transfer Aggregator
- GoPay eMoney Aggregator
- BSI Virtual Account Aggregator

## Website

Gunakan URL publik berikut (tidak perlu login):

```text
https://astoria-learning-capstone-project.vercel.app/produk
```

Halaman ini menampilkan:

- deskripsi produk SOBAT ADI,
- paket Free dan Premium,
- harga **Rp19.000 / 30 hari**,
- fitur Premium,
- cara berlangganan,
- metode pembayaran yang didukung,
- kebijakan pembatalan/pengembalian dana,
- tautan legal dan kontak.

## Business Supporting Document

Siapkan satu PDF gabungan berisi:

1. **Profil bisnis**
   - Nama brand: SOBAT ADI
   - Deskripsi: platform belajar PJJ berbasis AI
   - Website: URL `/produk`
   - Kontak: admin1@moedatrace.com
   - Produk: langganan digital Premium Rp19.000/30 hari
   - Target pengguna: mahasiswa PJJ
   - Alur transaksi (lihat `MIDTRANS-ONBOARDING.md`)

2. **Dokumen legal** (sesuai bentuk usaha)

   | Bentuk usaha | Dokumen |
   |---|---|
   | PT/CV/UD | NIB, NPWP badan, akta pendirian, SK Kemenkumham, KTP direktur, rekening bank bisnis |
   | Perorangan | KTP, NPWP, rekening bank atas nama sendiri |
   | Universitas/proyek kampus | Surat keterangan institusi, KTP penanggung jawab, NPWP (jika ada), surat kuasa/penunjukan |

3. **Bukti bisnis**
   - screenshot halaman `/produk`,
   - screenshot dialog paket Premium,
   - contoh invoice/transaksi (jika sudah ada),
   - akun dummy untuk reviewer (di PDF flow, bukan di repo).

4. **Kebijakan**
   - pembatalan sebelum pembayaran,
   - pengembalian dana,
   - kontak layanan pelanggan,
   - pernyataan tidak ada pengiriman barang (produk digital).

## Jika proyek kampus / belum ada badan usaha

Metode **GoPay QRIS, Bank Transfer, GoPay eMoney, dan BSI VA** umumnya
memerlukan badan usaha atau perorangan dengan NIB/NPWP dan rekening bank yang
sesuai. Proyek kampus tanpa badan usaha biasanya **tidak lolos** review
aggregator jika hanya mengirim screenshot aplikasi.

Ada dua jalur yang realistis:

### A. Memakai entitas kampus/universitas (disarankan)

Gunakan badan hukum universitas/foundation sebagai merchant:

1. Surat keterangan/penunjukan resmi dari universitas/fakultas bahwa SOBAT ADI
   adalah proyek di bawah institusi.
2. NPWP dan NIB institusi.
3. Rekening bank atas nama institusi.
4. KTP penanggung jawab proyek.
5. Surat kuasa untuk mendaftarkan Midtrans dan menggunakan rekening institusi.
6. Profil bisnis + website `/produk`.

Template surat: [`MIDTRANS-CAMPUS-LETTER-TEMPLATE.md`](./MIDTRANS-CAMPUS-LETTER-TEMPLATE.md).

### B. Mendaftar sebagai usaha perorangan

1. Buat NIB melalui OSS dan NPWP perorangan.
2. Siapkan rekening bank atas nama sendiri.
3. KTP dan bukti usaha.
4. Profil bisnis + website `/produk`.
5. Ajukan sebagai perorangan; tidak semua metode aggregator tersedia.

### Jika keduanya tidak memungkinkan

Jangan memaksakan channel aggregator. Pertahankan aktivasi Premium manual oleh
admin sampai entitas legal tersedia. Ini lebih aman daripada mengirim dokumen
yang tidak sesuai.

## Per metode pembayaran

| Metode | Business Supporting Document | Website |
|---|---|---|
| GoPay QRIS Aggregator | PDF business profile + legal + rekening/merchant | URL `/produk` |
| Bank Transfer Aggregator | PDF business profile + legal + rekening bank | URL `/produk` |
| GoPay eMoney Aggregator | PDF business profile + legal + akun GoPay bisnis | URL `/produk` |
| BSI Virtual Account Aggregator | PDF business profile + legal + rekening BSI | URL `/produk` |

Jika formulir Midtrans menyediakan satu unggahan per metode, gunakan PDF dan URL
yang sama untuk keempatnya, kecuali Midtrans meminta dokumen khusus metode
(QRIS merchant, rekening BSI, dsb.).

## Catatan penting

- **Badan usaha:** metode aggregator seperti QRIS/VA umumnya memerlukan badan
  usaha atau perorangan dengan NIB/NPWP. Jika SOBAT ADI masih proyek kampus
  tanpa badan usaha, siapkan surat keterangan institusi dan konfirmasi ke
  Midtrans apakah metode tersebut dapat disetujui.
- **Jangan mengarang dokumen legal.** Unggah dokumen asli yang berlaku.
- **Akun dummy** dan **flow transaksi** adalah dokumen terpisah dari Business
  Supporting Document.
- File yang berisi kredensial dummy tetap di `%TEMP%\opencode\midtrans-review\`
  dan tidak di-commit.
