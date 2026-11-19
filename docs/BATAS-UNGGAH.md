# Batas Unggah Dokumen

Dokumen dianggap valid hanya jika seluruh syarat terpenuhi.

## 1. Batas per paket

| Batas | Free | Premium |
|---|---:|---:|
| Ukuran PDF | 2 MB | 5 MB |
| Ukuran file teks | 1 MB | 1 MB |
| Isi dokumen | 8.000 karakter | 20.000 karakter |
| Kuota AI | 30 per hari | 300 per hari |

Format yang didukung: PDF, TXT, dan MD. PDF harus berbasis teks, bukan hasil
scan tanpa lapisan teks.

## 2. Urutan pemeriksaan

1. Format file didukung.
2. Ukuran file tidak melebihi batas.
3. PDF memiliki teks yang dapat diekstrak.
4. Isi dokumen tidak kosong.
5. Jumlah karakter tidak melebihi batas paket.

Kegagalan pada satu syarat membuat unggahan ditolak. Checklist menampilkan semua
syarat sekaligus agar pengguna tahu bagian mana yang perlu diperbaiki.

## 3. Pemecahan otomatis

Bila isi melebihi batas karakter:

- sistem menghitung jumlah bagian yang dibutuhkan,
- teks dipecah mengutamakan judul bab atau bagian,
- jika tidak ada judul, dipecah per paragraf,
- jika paragraf masih terlalu panjang, dipotong pada batas karakter.

Pengguna memilih bagian yang akan diproses. Setiap bagian diberi nama berkas
dengan akhiran `-bagian-N.txt`. Dokumen asli tidak diubah.

Tidak ada pemotongan diam-diam. Pengguna harus memilih bagian secara sadar agar
rujukan jawaban tetap benar.

## 4. Error terstruktur dari API

Jika batas karakter dilampaui, API mengembalikan status 413:

```json
{
  "code": "doc_too_long",
  "charCount": 12400,
  "maxChars": 8000,
  "overBy": 4400,
  "suggestedParts": 2
}
```

UI memakai data ini untuk menampilkan jumlah bagian dan membuka pemecahan
otomatis.

## 5. Pengujian

- Unit: `tests/unit/doc-split.test.ts` untuk pemecahan bab, paragraf, dan teks
  tanpa judul.
- E2E: `tests/e2e/upload-limits.spec.ts` untuk checklist, tombol pecah, pemilihan
  bagian, dan respons 413.
