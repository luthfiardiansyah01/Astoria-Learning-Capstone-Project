# Onboarding Midtrans — SOBAT ADI

Status: **koreksi dokumen / in review** (10 November 2026).

Midtrans meminta **Business Supporting Document** dan **Website** untuk empat
metode pembayaran. Checklist lengkap ada di
[`MIDTRANS-BUSINESS-DOCS.md`](./MIDTRANS-BUSINESS-DOCS.md).

Karena SOBAT ADI masih **proyek kampus** tanpa badan usaha, jalur yang paling
realistis adalah memakai entitas universitas/institusi sebagai merchant. Template
surat ada di
[`MIDTRANS-CAMPUS-LETTER-TEMPLATE.md`](./MIDTRANS-CAMPUS-LETTER-TEMPLATE.md).
Tanpa entitas legal/NIB/NPWP dan rekening bisnis, channel aggregator seperti
QRIS/VA/e-money kemungkinan besar tidak disetujui.

**Website publik:** https://astoria-learning-capstone-project.vercel.app/produk

Dokumen ini merangkum jawaban formulir "Data Tambahan / Data Susulan Onboarding"
Midtrans. Artefak yang berisi akun dummy **tidak disimpan di repo**; salinannya
ada di `%TEMP%\opencode\midtrans-review\`.

## Poin 1 — Katalog produk/layanan

Unggah **`KATALOG-PRODUK-SOBAT-ADI.pdf`**.

Isi katalog:

- Produk: **SOBAT ADI Premium**
- Harga: **Rp19.000 (IDR) / 30 hari**
- Jenis: langganan digital, bukan barang fisik
- Fitur: Mentor AI, kuis, unggah modul, kolaborasi tim, analitik
- Screenshot dialog paket di aplikasi

## Poin 2 — End-to-end process

Pelanggan membuka https://astoria-learning-capstone-project.vercel.app/login
dan masuk. Setelah login, pelanggan membuka dialog **Paket SOBAT ADI** dari
badge paket di header, memilih **Premium Rp19.000/30 hari**, lalu menekan
**Upgrade Sekarang**. Sistem membuat pesanan `pending` dengan order ID unik
dan mengarahkan pelanggan ke halaman pembayaran **Midtrans Snap**. Pelanggan
memilih channel pembayaran yang tersedia dan menyelesaikan pembayaran.
Midtrans mengirim webhook ke `/api/billing/webhook/midtrans`; sistem
memverifikasi signature SHA512, mencocokkan nominal, lalu mengaktifkan atau
memperpanjang Premium 30 hari secara idempoten. Status pembayaran dan masa
aktif dapat dilihat di aplikasi. Produk adalah langganan digital, tanpa
pengiriman barang.

## Poin 3 — Range harga

```text
19000
```

## Poin 4 — Dokumen tambahan

Unggah **`ALUR-TRANSAKSI-DAN-AKUN-DUMMY.pdf`**.

Isinya:

- Screenshot login, beranda, dan dialog paket
- Alur checkout → Midtrans Snap → webhook → aktivasi
- Akun dummy untuk reviewer (hanya ada di PDF lokal, tidak di repo)

## Catatan

- Channel pembayaran belum muncul karena masih business review. Setelah
  disetujui, uji satu transaksi kecil end-to-end.
- Nonaktifkan akun dummy setelah review selesai.
- Jangan commit artefak dari `%TEMP%\opencode\midtrans-review\`.
