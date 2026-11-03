# Rencana Implementasi — Kualitas Kode & Pengujian

Dokumen ini melengkapi `docs/RENCANA-IMPLEMENTASI.md` (kesiapan produksi). Fokus di sini: membuat kode **terverifikasi otomatis** dan **aman diubah**, bukan menambah fitur.

## Status implementasi (3 November 2026)

| Fase | Status | Bukti |
|---|---|---|
| Fase 0 — Fondasi tooling | **Selesai** | `vitest.config.mts`, `tests/setup.ts`, script `typecheck`/`test`/`test:unit`/`test:coverage`/`verify` |
| Fase 1 — Standar tipe & lint | **Selesai (gelombang 1)** | `noImplicitAny: true`, `reactStrictMode: true`, aturan `prefer-const`, `no-unused-vars`, `no-empty`, `no-unreachable`, `no-redeclare`, `no-case-declarations` aktif; `eslint .` bersih |
| Fase 2 — Unit test logika murni | **Selesai** | 132 test di `tests/unit`, 8 file; coverage 76% statement / 78% baris / 78% fungsi / 66% cabang |
| Fase 3 — Integration test API | **Selesai** | 107 test di `tests/integration` dengan PostgreSQL uji (`db-test`); coverage API 76% baris / 71% statement |
| Fase 4 — E2E Playwright | Belum | Butuh mock AI |
| Fase 5 — CI | **Sebagian** | `.github/workflows/ci.yml` menjalankan typecheck, lint, unit test + coverage, integration test + coverage, dan build; E2E belum |
| Fase 6 — Observability & pembersihan | Belum | Logger, error boundary, dan aturan `no-console` belum |


- Basis kode: Next.js 16, React 19, Prisma 6 + PostgreSQL, NextAuth, 25 route API, 18 modul `src/lib`.
- Sasaran akhir: setiap PR melewati typecheck, lint, unit test, integration test, dan E2E kritis di CI.

---

## 0. Ringkasan eksekutif

| Aspek | Kondisi terukur (31 Okt 2026) | Risiko |
|---|---|---|
| Typecheck | `tsc --noEmit` **lulus, 0 error** | `noImplicitAny: false` melemahkan `strict` |
| Lint | `eslint .` **lulus, 0 error** | ±27 aturan dimatikan, termasuk `no-unused-vars`, `exhaustive-deps`, `no-console` |
| Unit/integration test | **Tidak ada** (tidak ada runner, tidak ada script `test`) | Perubahan kecil bisa merusak logika XP, chunking, validasi |
| E2E | Hanya `scripts/smoke.ps1` manual | Regresi alur utama tidak terdeteksi sebelum demo |
| CI | **Tidak ada** `.github/workflows` | Tidak ada gerbang kualitas; `main` bisa menerima kode rusak |
| Coverage | **0%** | Tidak ada ukuran kemajuan |
| `any` eksplisit | **0** dari 128 file `src` | Baik — pertahankan |
| `console.*` | **44** pemanggilan di kode server | Log tidak terstruktur, berpotensi membocorkan data |
| TODO/FIXME nyata | **0** (kata "todo" yang terdeteksi hanyalah status Kanban) | Baik |
| Batas error UI | Belum ada `error.tsx` / `not-found.tsx` / `loading.tsx` | Satu error server = layar putih |
| `reactStrictMode` | **`false`** | Efek ganda/hydration bug tidak terdeteksi saat dev |

**Kesimpulan:** "lint & typecheck bersih" saat ini menyesatkan karena banyak aturan dimatikan dan tidak ada test. Prioritas: pasang runner → naikkan standar secara bertahap → uji logika murni → uji API dengan database nyata → E2E dengan AI tiruan → CI.

---

## 1. Tujuan dan batas

### Tujuan
1. Semua logika bisnis kritis (XP, badge, chunking, validasi, rate limit, kepemilikan data) punya test otomatis.
2. Semua 25 route API punya minimal 1 test sukses + 1 test gagal (400/401/403/429).
3. Alur pengguna utama lolos E2E tanpa AI asli (deterministik, offline).
4. CI menolak merge bila typecheck, lint, atau test gagal.
5. Aturan lint/TS yang dimatikan berkurang drastis dan setiap pengecualian punya alasan tertulis.

### Bukan cakupan
- Fitur baru, redesign UI, optimasi performa.
- Deploy produksi dan operasi Supabase/Vercel (sudah di `docs/RENCANA-IMPLEMENTASI.md` dan `docs/DEPLOY-VERCEL.md`).
- Audit keamanan menyeluruh (test kita hanya menjaga perilaku yang sudah ada).
- Migrasi data.

---

## 2. Fase 0 — Fondasi tooling (≈0,5 hari)

**Tujuan:** satu perintah untuk memasang, mengecek tipe, dan menjalankan test.

1. Pulihkan binari lokal yang hilang (`.bin/tsc` dan `.bin/eslint` tidak lengkap):
   ```bash
   bun install
   ```
2. Tambah devDependency:
   ```bash
   bun add -d vitest @vitest/coverage-v8 jsdom \
     @testing-library/react @testing-library/jest-dom @testing-library/user-event \
     @playwright/test
   ```
3. Tambah script `package.json`:
   ```json
   {
     "typecheck": "tsc --noEmit",
     "test": "vitest run",
     "test:watch": "vitest",
     "test:unit": "vitest run tests/unit",
     "test:integration": "vitest run tests/integration --no-file-parallelism",
     "test:e2e": "playwright test",
     "verify": "bun run typecheck && bun run lint && bun run test:unit"
   }
   ```
4. Buat `vitest.config.ts`:
   ```ts
   import { defineConfig } from "vitest/config";
   import path from "node:path";

   export default defineConfig({
     resolve: { alias: { "@": path.resolve(__dirname, "src") } },
     test: {
       environment: "node",
       setupFiles: ["tests/setup.ts"],
       include: ["tests/**/*.test.ts"],
       coverage: {
         provider: "v8",
         reporter: ["text", "lcov"],
         include: ["src/lib/**", "src/app/api/**"],
         thresholds: { lines: 75, functions: 75, branches: 65 },
       },
     },
   });
   ```
   - `tests/setup.ts`: `process.env.NODE_ENV = "test"`, `TZ = "Asia/Jakarta"`, matikan `console` berisik.
   - Test yang menyentuh DOM memakai `// @vitest-environment jsdom`.
5. Buat struktur:
   ```
   tests/
     setup.ts
     unit/           # logika murni, tanpa DB
     integration/    # route API + PostgreSQL
     e2e/            # Playwright + mock AI
   ```

**Definisi selesai:** `bun run verify` jalan dan gagal bila ada error tipe/lint; `bun run test` lulus (0 test) tanpa konfigurasi error.

---

## 3. Fase 1 — Naikkan standar tipe & lint (≈1 hari)

Lakukan **satu commit per kelompok aturan** agar mudah di-bisect.

### 3.1 TypeScript
- `tsconfig.json`: `noImplicitAny: true`.
- `next.config.ts`: `reactStrictMode: true` → uji ulang semua alur klien (double-invoke effect bisa memunculkan race condition nyata; perbaiki, jangan matikan kembali).
- Pertahankan `skipLibCheck: true` (standar Next.js). Jangan tambah `ignoreBuildErrors`.

### 3.2 ESLint (`eslint.config.mjs`)
Aktifkan bertahap, mulai dari yang paling murah:

| Gelombang | Aturan | Perkiraan temuan |
|---|---|---|
| 1 | `prefer-const`, `no-unused-vars`, `no-empty`, `no-unreachable`, `no-redeclare` | Kecil, mekanis |
| 2 | `@typescript-eslint/no-explicit-any`, `ban-ts-comment` | 0 (sudah bersih) |
| 3 | `react-hooks/exhaustive-deps` (mulai `warn`) | Sedang — perbaiki dependency array |
| 4 | `no-console` (setelah Fase 6 punya logger) | 44 |
| 5 | `@next/next/no-img-element`, `no-unescaped-entities` | Kecil |

Aturan yang tetap dimatikan **wajib** diberi komentar alasan, misalnya:
```js
// Dimatikan sementara: komponen UI shadcn memakai pola ini; ditinjau di Fase 6.
"react/no-unescaped-entities": "off",
```

**Definisi selesai:** `bun run typecheck` dan `bun run lint` tetap 0 error, `reactStrictMode: true`, daftar aturan `off` menyusut dan terdokumentasi.

---

## 4. Fase 2 — Unit test logika murni (≈1,5 hari)

Ini investasi dengan rasio manfaat/biaya terbaik: cepat, tanpa DB, stabil.

| Modul | Kasus wajib |
|---|---|
| `src/lib/gamif.ts` | Batas `levelFromXp` (0, 99, 100, 249, 250, 4000+); `xpForNextLevel` (pct 0–100); `clampXp`/`clampSkor` untuk negatif, `NaN`, `Infinity`, string; `checkBadgeTriggers` tiap ambang |
| `src/lib/fallback.ts` | `isOutOfContext` untuk tiap pola; `preprocessUserInput` (spasi, huruf, input kosong) |
| `src/lib/rag.ts` | `tokenize`; `chunkDocument` ukuran 2000 + overlap 200, dokumen < 1 chunk, dokumen kosong; `countWords`; `retrieveRelevantChunks` urutan skor, batas `MAX_CONTEXT_LENGTH` |
| `src/lib/rag-semantic.ts` | Cosine similarity (vektor nol, orthogonal, identik), normalisasi |
| `src/lib/validation.ts` | Tiap schema: contoh valid + minimal satu penolakan; `readBody` untuk JSON rusak dan body kosong |
| `src/lib/collab-badges.ts`, `collab-gamif.ts` | Ambang badge tim dan perhitungan poin |
| `src/lib/user.ts` | `updateStreak` dengan `vi.setSystemTime` di batas tengah malam WIB |
| `src/lib/rate-limit.ts` | Jendela waktu, reset, isolasi key; fallback memori saat env Upstash kosong; `fetch` Upstash di-mock |
| `src/lib/ai.ts` | Retry 3x, rotasi model fallback, ekstraksi JSON dari markdown fence (ekstrak dulu jadi fungsi murni `parseJsonResponse`) |

Target: **≥90% baris & cabang** untuk modul di tabel.

**Definisi selesai:** `bun run test:unit` lulus < 10 detik; coverage modul murni ≥ 90%.

---

## 5. Fase 3 — Ekstraksi service + integration test API (≈2 hari)

### 5.1 Pecah route gemuk
Route terbesar: `api/documents/route.ts` (200 baris), `api/quiz/submit/route.ts` (189), `api/chat/route.ts` (161). Pola yang dituju:

```
route.ts        → auth guard + validasi zod + panggil service + bentuk response
lib/services/*  → logika bisnis, menerima (user, input, db) dan mengembalikan hasil polos
```

Modul baru: `src/lib/services/documents.ts`, `quiz.ts`, `chat.ts`, `collab.ts`.
Ini membuat logika bisa dites tanpa `Request`/`Response` dan mengurangi duplikasi guard.

### 5.2 Database uji
- Gunakan PostgreSQL dari `docker-compose.yml` (atau service container di CI).
- `DATABASE_URL`/`DIRECT_URL` test memakai database terpisah, mis. `astoria_test`.
- Sebelum suite: `prisma migrate deploy`; antar test: truncate tabel (kecuali `_prisma_migrations`).
- **Jangan pernah** mengarahkan test ke database produksi/Supabase.

### 5.3 Matriks test per route (25 route)
| Kelompok | Contoh kasus |
|---|---|
| Auth | Tanpa sesi → 401; role salah → 403 |
| Validasi | Body tidak valid → 400 dengan pesan; field asing diabaikan |
| Kepemilikan | Dokumen milik orang lain → 403; dokumen `approved` → boleh dipakai |
| Kuis | Skor dihitung server (skor klien diabaikan); XP & badge bertambah tepat sekali |
| Chat | Riwayat dibatasi 6 pesan; dokumen di luar akses tidak masuk konteks |
| Admin | `decision` hanya untuk admin; analitik tidak membocorkan data tim lain |
| Rate limit | Melebihi `LIMITS.*` → 429 + header `Retry-After` |
| Collab | Non-anggota tidak bisa melihat/mengubah proyek & tugas |

Sesi di-mock lewat `vi.mock("@/lib/current-user")` agar tidak perlu login sungguhan. AI di-mock di lapisan `src/lib/ai.ts`.

Target: **≥70% baris** untuk `src/app/api/**` + `src/lib/services/**`; setiap route punya minimal satu test sukses dan satu test gagal.

**Definisi selesai:** `bun run test:integration` lulus dari database kosong hanya dengan `docker compose up -d` + migrasi.

---

## 6. Fase 4 — E2E Playwright (≈1,5 hari)

### 6.1 AI tiruan (kunci stabilitas)
Buat `tests/e2e/mock-ai.ts`: server HTTP kecil yang meniru `POST /v1/chat/completions` dan `/v1/embeddings` dengan respons tetap (termasuk JSON kuis yang valid). Jalankan bersama `webServer` Playwright, lalu set:

```
AI_BASE_URL=http://127.0.0.1:4010/v1
AI_API_KEY=test
```

Manfaat: E2E tidak memakai kuota, tidak flaky karena model gratis, dan bisa dijalankan offline di CI.

### 6.2 Skenario wajib
1. Daftar → login → logout → login lagi.
2. Beranda menampilkan statistik pengguna yang login.
3. Unggah dokumen → ekstraksi → dokumen muncul → chat menjawab dengan sitasi.
4. Kuis: generate → jawab → skor/XP/badge tampil; refresh tidak menggandakan XP.
5. Tim: buat tim → tambah anggota via nama → buat proyek → buat/geser tugas Kanban → Mentor AI per tugas.
6. Admin: moderasi dokumen mengubah status; pengguna biasa tidak melihat panel admin.
7. Otorisasi: buka halaman utama tanpa login → diarahkan ke `/login`; akses API admin → 403.
8. Smoke viewport mobile (375×812) untuk Beranda, Mentor, Kuis.

Gunakan `data-testid` pada elemen kunci, bukan selector teks (teks bisa berubah). Simpan trace + screenshot saat gagal; retry 1x di CI.

**Definisi selesai:** `bun run test:e2e` lulus 3x berturut-turut secara lokal tanpa AI asli.

---

## 7. Fase 5 — CI dan gerbang kualitas (≈1 hari)

Buat `.github/workflows/ci.yml`:

```yaml
name: CI
on:
  pull_request:
  push: { branches: [main] }
concurrency:
  group: ci-${{ github.ref }}
  cancel-in-progress: true
jobs:
  quality:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: oven-sh/setup-bun@v2
      - run: bun install --frozen-lockfile
      - run: bunx prisma generate
      - run: bun run typecheck
      - run: bun run lint
      - run: bun run test:unit -- --coverage
  integration:
    runs-on: ubuntu-latest
    services:
      postgres:
        image: postgres:16-alpine
        env:
          POSTGRES_USER: astoria
          POSTGRES_PASSWORD: astoria
          POSTGRES_DB: astoria_test
        ports: ["5432:5432"]
        options: >-
          --health-cmd "pg_isready -U astoria"
          --health-interval 5s --health-timeout 3s --health-retries 10
    env:
      DATABASE_URL: postgresql://astoria:astoria@localhost:5432/astoria_test?schema=public
      DIRECT_URL: postgresql://astoria:astoria@localhost:5432/astoria_test?schema=public
      NEXTAUTH_SECRET: test-secret
      NEXTAUTH_URL: http://localhost:3000
    steps:
      - uses: actions/checkout@v4
      - uses: oven-sh/setup-bun@v2
      - run: bun install --frozen-lockfile
      - run: bunx prisma migrate deploy
      - run: bun run test:integration
  # e2e: job terpisah, jalankan `bunx playwright install --with-deps chromium`,
  # lalu `bun run test:e2e` dengan mock AI. Boleh `continue-on-error` 2 minggu pertama.
```

Tambahan:
- Lindungi `main`: wajib PR + check `quality` dan `integration` hijau.
- Commit build artifact test (coverage, trace) sebagai artifact CI, bukan ke git.
- Jalankan `bun audit` (non-blocking dulu) untuk memantau kerentanan dependensi.

**Definisi selesai:** PR yang sengaja merusak tipe/test ditolak CI; PR normal hijau < 10 menit.

---

## 8. Fase 6 — Observability, ketahanan UI, dan pembersihan (≈1 hari)

1. **Logger terstruktur** `src/lib/logger.ts`:
   - Level via `LOG_LEVEL`; JSON di produksi.
   - Ganti 44 `console.*` dengan `logger.info/warn/error`.
   - Redaksi email, token, isi dokumen, dan pesan error mentah dari AI.
2. **Batas error UI:** `src/app/error.tsx`, `global-error.tsx`, `not-found.tsx`, `loading.tsx` dengan bahasa Indonesia dan tombol "Coba lagi"/"Kembali".
3. **Bersihkan artefak scaffold** yang mengotori repo:
   - `scripts/contrast-*.png`, `scripts/verify-*.png`, `scripts/unggah-*.png` → hapus atau pindahkan ke `docs/assets/`.
   - `tests/database-runtime-build.sh`, `python-runtime-*.sh` bukan test aplikasi → hapus atau pindahkan ke `docs/legacy/` dengan catatan.
4. **Deteksi kode/dependensi mati:** `bunx knip` (sekali jalan, periksa manual). Banyak paket Radix/shadcn kemungkinan tidak terpakai — hapus hanya setelah `knip` + `tsc` + E2E hijau.
5. **Rapikan konstanta ajaib:** `MAX_CONTEXT_LENGTH`, ambang badge/XP, dan limit rate limit dikumpulkan per domain agar mudah diuji.

---

## 9. Definisi selesai keseluruhan

- [ ] `bun run typecheck` → 0 error, `noImplicitAny: true`.
- [ ] `bun run lint` → 0 error; daftar aturan `off` minimal dan beralasan.
- [ ] `bun run test:unit` → coverage modul murni ≥ 90%.
- [ ] `bun run test:integration` → semua 25 route punya happy + error path; coverage API ≥ 70%.
- [ ] `bun run test:e2e` → 8 skenario utama lulus, 3x berturut-turut.
- [ ] `reactStrictMode: true` dan alur klien tetap lulus E2E.
- [ ] CI hijau di setiap PR; `main` terlindungi.
- [ ] Tidak ada `console.*` di kode server; error UI tersedia.
- [ ] Repo bersih dari screenshot/skrip scaffold.

---

## 10. Jadwal dan estimasi (1 pengembang)

| Fase | Estimasi | Ketergantungan |
|---|---|---|
| 0. Fondasi tooling | 0,5 hari | — |
| 1. Type & lint | 1 hari | Fase 0 |
| 2. Unit test lib murni | 1,5 hari | Fase 0 |
| 3. Service + integration test | 2 hari | Fase 0, DB Docker/Supabase test |
| 4. E2E + mock AI | 1,5 hari | Fase 3 (data seed stabil) |
| 5. CI | 1 hari | Fase 0–4 |
| 6. Observability & pembersihan | 1 hari | Fase 1 |
| **Total** | **≈8,5 hari kerja** | |

Urutan yang disarankan bila waktu terbatas: **0 → 2 → 5 → 3 → 4 → 1 → 6**. Unit test + CI lebih dulu memberi nilai tercepat.

---

## 11. Risiko dan mitigasi

| Risiko | Dampak | Mitigasi |
|---|---|---|
| Mengaktifkan semua aturan lint sekaligus | Ratusan temuan, PR raksasa | Bertahap per gelombang, satu commit per aturan |
| `reactStrictMode` memunculkan bug efek ganda | Alur klien rusak saat dev | Perbaiki sumber (cleanup effect, AbortController), jangan matikan lagi |
| Integration test butuh DB | Lambat/flaky di CI | Service container + database khusus + truncate; jalankan serial |
| AI gratis tidak deterministik | E2E flaky & boros kuota | Mock AI lokal untuk seluruh test otomatis |
| Playwright flaky | Kepercayaan CI turun | `data-testid`, seed tetap, retry 1x, trace on failure |
| Next 16 / React 19 vs testing-library | Ketidakcocokan versi | Gunakan rilis terbaru, pin di `bun.lock`, mulai dari unit test |
| Refactor route ke service | Regresi saat pemindahan | Pindahkan tanpa mengubah perilaku, jaga test integration sebagai jaring |
| Waktu capstone terbatas | Fase 4–6 tidak selesai | Prioritaskan Fase 0, 2, 5; E2E boleh manual sementara |

---

## 12. Ringkasan perubahan file

| File/folder | Aksi |
|---|---|
| `package.json` | Tambah script `typecheck`, `test*`, `verify`; devDeps test |
| `vitest.config.ts`, `tests/setup.ts` | Baru |
| `tests/unit/**`, `tests/integration/**`, `tests/e2e/**` | Baru |
| `playwright.config.ts`, `tests/e2e/mock-ai.ts` | Baru |
| `tsconfig.json` | `noImplicitAny: true` |
| `next.config.ts` | `reactStrictMode: true` |
| `eslint.config.mjs` | Aktifkan aturan bertahap + dokumentasi pengecualian |
| `src/lib/services/**` | Baru (hasil ekstraksi route) |
| `src/lib/logger.ts` | Baru |
| `src/app/error.tsx`, `global-error.tsx`, `not-found.tsx`, `loading.tsx` | Baru |
| `.github/workflows/ci.yml` | Baru |
| `scripts/*.png`, `tests/*.sh` | Pindah/hapus |
