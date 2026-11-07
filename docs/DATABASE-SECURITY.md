# Keamanan Database & Row Level Security (Supabase)

## Status

Sejak migrasi `20261105000000_enable_row_level_security`, **semua tabel di schema
`public` memiliki RLS aktif** dan tidak memiliki policy publik.
Per 8 November 2026 ada **19 tabel** dan **8 migrasi** yang diterapkan.

Tabel yang dicakup:

`_prisma_migrations`, `User`, `Team`, `TeamBadge`, `Notification`, `TeamMember`,
`Project`, `Task`, `Document`, `TaskChatMessage`, `ActivityEvent`, `Chunk`,
`ChatMessage`, `QuizQuestion`, `QuizAttempt`, `Badge`, `Payment`, `TeamInvite`,
`EmailVerificationToken`.

Migrasi P3 `20261107030000_p3_constraints_indexes` juga menambahkan:

- unique `(projectId, status, order)` pada `Task`,
- index komposit untuk `Payment`, `QuizAttempt`, dan `Document`,
- CHECK constraint untuk role/plan/status,
- FK `Payment.userId` dengan `ON DELETE RESTRICT` agar riwayat pembayaran
  tidak hilang saat user dihapus.

## Kenapa aman untuk aplikasi

- Aplikasi mengakses database lewat **Prisma** menggunakan role `postgres`
  (koneksi server-side), sehingga tidak terpengaruh RLS.
- Akses langsung melalui Supabase PostgREST dengan role `anon`/`authenticated`
  tidak memiliki policy → data tidak terbaca/tertulis.
- Service role key tidak boleh dipakai di frontend.

## Verifikasi

```sql
SELECT c.relname, c.relrowsecurity
FROM pg_class c
JOIN pg_namespace n ON n.oid = c.relnamespace
WHERE n.nspname = 'public' AND c.relkind = 'r'
ORDER BY c.relname;
```

Semua baris harus `relrowsecurity = true`.

Uji akses anon:

```sql
BEGIN;
SET LOCAL ROLE anon;
SELECT count(*) FROM "User";
ROLLBACK;
```

Hasil harus `0` atau ditolak.

## Aturan untuk tabel baru

Setiap kali menambah model/tabel baru, migrasi harus menyertakan:

```sql
ALTER TABLE "public"."NamaTabel" ENABLE ROW LEVEL SECURITY;
```

Jangan menambahkan policy `USING (true)` untuk `anon`/`authenticated` kecuali
memang ada kebutuhan akses publik yang disengaja.

## Catatan

- Linter Supabase awalnya melaporkan 17 temuan `rls_disabled_in_public`; setelah
  migrasi RLS dan dua tabel baru (`TeamInvite`, `EmailVerificationToken`),
  seluruh **19 tabel** sudah memiliki RLS.
- RLS bukan pengganti otorisasi aplikasi. Route API tetap memeriksa sesi,
  role admin, kepemilikan dokumen, dan keanggotaan tim di sisi server.
- `Payment` memakai `ON DELETE RESTRICT`; user dengan riwayat pembayaran harus
  diarsipkan/soft-delete, bukan dihapus langsung.
