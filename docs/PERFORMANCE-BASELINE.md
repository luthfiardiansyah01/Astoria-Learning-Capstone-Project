# Baseline Performa SOBAT ADI — 18 November 2026

Dokumen ini mencatat **kondisi awal terukur** sebelum optimasi. Semua angka
diambil pada commit `522253e` (Next 16.4.6) dengan skrip di `scripts/perf/`.

> Tujuan: memastikan optimasi berikutnya punya pembanding yang sama, bukan
> klaim tanpa angka.

## 1. Metode

| Aspek | Nilai |
|---|---|
| Build | `bun run build`, cache hangat |
| Server | `next start` lokal, port 3200, `NODE_ENV=production` |
| Database | PostgreSQL 16 (container uji, port 5434) |
| Data uji | 5.002 dokumen, 300+1.000 tugas, 5.000 activity event, 16 user |
| Beban | 30 iterasi per endpoint (3 pemanasan), klien tunggal |
| Produksi | 10 sampel TTFB per halaman dari satu lokasi jaringan |

Cara mengulang:

```bash
bun scripts/perf/seed-test-data.ts     # isi database uji
bun run build
# jalankan server dengan DATABASE_URL database uji, lalu:
bun scripts/perf/bench-http.ts
bun scripts/perf/bench-db.ts
bun scripts/perf/bench-prod.ts
```

## 2. Ringkasan eksekutif

Tiga temuan utama:

1. **`GET /api/documents` tidak terbatas** — 5.002 dokumen menghasilkan respons
   **1,01 MB** dan **198 ms** (p95 253 ms). Penyebab: seluruh kolom termasuk
   `content` (7,2 MB) diambil, lalu semua baris dikirim.
2. **Analitik memuat data berlebih** — `/api/collab/analytics` naik dari 24 ms
   menjadi **89 ms** (p95 103 ms) karena memuat seluruh tim, proyek, tugas, dan
   aktivitas. `/api/admin/analytics` naik 11 ms → **44 ms** karena memuat semua
   dokumen untuk dihitung di JavaScript.
3. **Output server 31,6 MB** — jauh di atas ukuran wajar. Peringatan Turbopack
   menunjukkan `src/lib/ai.ts` membaca file secara dinamis sehingga **seluruh
   proyek ikut ditelusuri** ke dalam output.

## 3. Metrik build

| Metrik | Nilai |
|---|---:|
| Waktu build (cache hangat) | **12,8 detik** |
| Output server (`.next/server`) | **31,6 MB** |
| Output statis (`.next/static`) | **2,5 MB** |
| Halaman statis | 8 |
| Route API | 42 |

## 4. Latensi HTTP lokal

### 4.1 Kondisi kecil (302 dokumen, 100 tugas)

| Endpoint | p50 | p95 | Ukuran |
|---|---:|---:|---:|
| `GET /login` | 2 ms | 4 ms | 26 KB |
| `GET /produk` | 2 ms | 5 ms | 59 KB |
| `GET /api/plan` | 7 ms | 9 ms | 0,4 KB |
| `GET /api/documents` | 18 ms | 25 ms | 61 KB |
| `GET /api/admin/analytics` | 11 ms | 14 ms | 0,4 KB |
| `GET /api/collab/analytics` | 24 ms | 32 ms | 2 KB |
| `GET project detail` | 16 ms | 19 ms | 39 KB |

### 4.2 Kondisi skala (5.002 dokumen, 1.000 tugas)

| Endpoint | p50 | p95 | Maks | Ukuran | Perubahan |
|---|---:|---:|---:|---:|---|
| `GET /login` | 2 ms | 3 ms | 4 ms | 26 KB | stabil |
| `GET /produk` | 2 ms | 3 ms | 4 ms | 59 KB | stabil |
| `GET /api/plan` | 5 ms | 6 ms | 7 ms | 0,4 KB | stabil |
| **`GET /api/documents`** | **198 ms** | **253 ms** | 256 ms | **1,01 MB** | **11× lebih lambat** |
| `GET /api/collab/teams` | 10 ms | 13 ms | 14 ms | 1,7 KB | stabil |
| `GET /api/collab/leaderboard` | 9 ms | 11 ms | 13 ms | 0,1 KB | stabil |
| `GET /api/admin/users` | 10 ms | 13 ms | 22 ms | 4,7 KB | stabil |
| **`GET /api/admin/analytics`** | **44 ms** | **56 ms** | 365 ms | 0,4 KB | **4× lebih lambat** |
| `GET /api/admin/payments` | 7 ms | 10 ms | 12 ms | 0,9 KB | stabil |
| **`GET project detail`** | **40 ms** | **49 ms** | 355 ms | **327 KB** | **2,5× lebih lambat** |
| `GET project activity` | 12 ms | 15 ms | 20 ms | 8,8 KB | stabil |
| **`GET /api/collab/analytics`** | **89 ms** | **103 ms** | 404 ms | 2 KB | **3,7× lebih lambat** |

Catatan: `max` yang jauh di atas p95 (355–404 ms) menandakan **jitter** —
kemungkinan garbage collection atau serialisasi payload besar.

## 5. Berat aset frontend

Diukur dari HTML yang direferensikan server lokal (belum dikompresi):

| Halaman | HTML | JS | CSS |
|---|---:|---:|---:|
| `/login` | 25,6 KB | **705 KB** | 84 KB |
| `/produk` | 58,0 KB | **702 KB** | 84 KB |

JS ±700 KB sebelum kompresi. Sebagian besar berasal dari chunk bersama
(React, framer-motion, Radix). Perlu analisis bundle sebelum memutuskan
code-splitting.

## 6. Analisis database

| Item | Nilai |
|---|---|
| Baris `Document` | 5.002 |
| Ukuran tabel `Document` | 10,2 MB |
| Total kolom `content` | **7,2 MB** (rata-rata 1.481 B/baris) |
| Query dokumen (semua kolom, urut `createdAt`) | 2,1 ms — **Seq Scan + Sort** |
| Query dokumen (kolom minimal, `LIMIT 50`) | 1,7 ms — masih Seq Scan + Sort |
| Query 1.000 task per proyek | 0,9 ms — Seq Scan (tabel kecil) |
| Activity feed (`LIMIT 20`) | **0,04 ms** — Index Scan |

Kesimpulan: **database bukan bottleneck**. Waktu 198 ms pada `/api/documents`
berasal dari pengambilan 7,2 MB kolom `content`, hidrasi Prisma, dan
serialisasi 1 MB JSON. Namun urutan `createdAt` belum punya index khusus,
sehingga akan menjadi masalah saat tabel mencapai ratusan ribu baris.

## 7. TTFB produksi

| Halaman | p50 | p95 | Ukuran |
|---|---:|---:|---:|
| `/login` | 32 ms | 137 ms | 27 KB |
| `/produk` | 30 ms | 64 ms | 60 KB |
| `/legal/kebijakan-privasi` | 40 ms | 54 ms | 47 KB |

Angka ini sudah termasuk jaringan, jadi wajar lebih tinggi dari lokal.

## 8. Diagnosis dan rencana optimasi

Diurutkan berdasarkan rasio dampak/risiko.

### P1 — dampak besar, risiko rendah

| # | Perbaikan | Target terukur |
|---|---|---|
| 1 | `/api/documents`: pilih kolom minimal (`id, fileName, wordCount, status, createdAt, uploader`), jangan ambil `content`; tambah pagination (`limit` + cursor) | 1,01 MB → **< 60 KB**; 198 ms → **< 20 ms** |
| 2 | Index `Document(createdAt)` untuk urutan admin | Menghindari Sort saat data besar |
| 3 | `/api/admin/analytics`: `groupBy` status, hitung total di SQL, top-3 populer lewat query terbatas | 44 ms → **< 15 ms**, tidak lagi memuat semua dokumen |
| 4 | Hapus pembacaan file dinamis di `ai.ts` (pakai env saja atau isolasi modul) | output server 31,6 MB → **< 10 MB**; peringatan Turbopack hilang |

### P2 — dampak sedang

| # | Perbaikan | Target |
|---|---|---|
| 5 | `/api/collab/analytics`: batasi aktivitas ke 14 hari di SQL, pilih kolom minimal, agregasi per tim | 89 ms → **< 25 ms** |
| 6 | Project detail: pisahkan tugas `done` atau pagination per kolom Kanban | 327 KB → **< 120 KB** |
| 7 | Cache header untuk halaman statis (`/produk`, legal) | TTFB produksi turun |

### P3 — perlu pengukuran tambahan

| # | Perbaikan | Catatan |
|---|---|---|
| 8 | Analisis bundle JS, lazy-load `recharts`/`framer-motion` | Perlu `@next/bundle-analyzer` |
| 9 | Kurangi chunk bersama di halaman publik | Ukur setelah P1 |

## 9. Batasan pengukuran

- Satu klien, tanpa konkurensi; belum mengukur throughput atau perilaku di bawah beban.
- Server lokal tanpa cold start serverless; angka produksi hanya TTFB halaman publik.
- Data sintetis (konten seragam) sehingga kompresi HTTP lebih baik daripada data nyata.
- Belum mengukur memori proses dan waktu render server (RSC) per halaman.

## 10. Kriteria keberhasilan optimasi

Optimasi dianggap berhasil bila, pada data dan metode yang sama:

1. `/api/documents` p95 **< 50 ms** dan respons **< 100 KB**.
2. `/api/admin/analytics` p95 **< 25 ms**.
3. `/api/collab/analytics` p95 **< 50 ms**.
4. Output server **< 10 MB** dan peringatan tracing hilang.
5. Semua tes (unit, integrasi, E2E) tetap lulus.
