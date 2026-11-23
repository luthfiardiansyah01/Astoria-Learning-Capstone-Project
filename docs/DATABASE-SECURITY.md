# Keamanan Database & Row Level Security (Supabase)

## Status

Per **23 November 2026**, database produksi memiliki:

| Pemeriksaan | Nilai |
|---|---:|
| Tabel schema `public` | 23 |
| Tabel dengan RLS aktif | 22 |
| Policy RLS publik | 0 |
| Migrasi diterapkan | 18 |
| Tabel tanpa RLS | `PushSubscription` |

Tabel yang sudah memiliki RLS:

`_prisma_migrations`, `User`, `Team`, `TeamBadge`, `Notification`, `TeamMember`,
`Project`, `Task`, `Document`, `TaskChatMessage`, `ActivityEvent`, `Chunk`,
`ChatMessage`, `QuizQuestion`, `QuizAttempt`, `Badge`, `Payment`, `TeamInvite`,
`EmailVerificationToken`, `PasswordResetToken`, `AdminAuditLog`,
`AnalyticsCache`.

Satu tabel baru, `PushSubscription`, belum memiliki RLS. Tabel ini dibuat pada
migrasi `20261119080000_push_subscriptions` dan perlu migrasi susulan:

```sql
ALTER TABLE "public"."PushSubscription" ENABLE ROW LEVEL SECURITY;
```

Tanpa migrasi itu, klaim "semua tabel memiliki RLS" tidak benar.

## Kenapa aplikasi tetap berjalan

- Aplikasi mengakses database lewat **Prisma** menggunakan role server
  (`postgres`), sehingga tidak terpengaruh RLS.
- Akses langsung melalui Supabase PostgREST dengan role `anon`/`authenticated`
  tidak memiliki policy, sehingga data tidak terbaca atau tertulis.
- Service role key tidak boleh dipakai di frontend.

Penting: dengan **0 policy**, RLS bukan isolasi data antarpengguna di dalam
aplikasi. Isolasi tetap dilakukan oleh otorisasi route API: sesi, role admin,
kepemilikan dokumen, dan keanggotaan tim. Jangan mengklaim RLS sebagai
pengganti otorisasi aplikasi.

## Riwayat migrasi terkait

- `20261105000000_enable_row_level_security`: RLS untuk tabel inti.
- `20261107010000_team_invite`: RLS `TeamInvite`.
- `20261107020000_email_verification`: RLS `EmailVerificationToken`.
- `20261107030000_p3_constraints_indexes`: unique `(projectId, status, order)`,
  index komposit, CHECK role/plan/status, FK `Payment.userId` ON DELETE RESTRICT.
- `20261118010000_p4_password_reset_consent`: RLS `PasswordResetToken`,
  kolom `Payment.consentAt`.
- `20261118020000_p5_audit_cache_vector`: RLS `AdminAuditLog`, `AnalyticsCache`.
- `20261118040000_pgvector_halfvec_hnsw`: index HNSW halfvec(2048).
- `20261119080000_push_subscriptions`: tabel baru, **belum RLS**.

## Verifikasi

```sql
SELECT c.relname, c.relrowsecurity
FROM pg_class c
JOIN pg_namespace n ON n.oid = c.relnamespace
WHERE n.nspname = 'public' AND c.relkind = 'r'
ORDER BY c.relname;
```

Semua baris harus `relrowsecurity = true`, kecuali `PushSubscription` sampai
migrasi susulan diterapkan.

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

- RLS bukan pengganti otorisasi aplikasi.
- `Payment` memakai `ON DELETE RESTRICT`; user dengan riwayat pembayaran harus
  diarsipkan/soft-delete, bukan dihapus langsung.
- Audit 23 November 2026 menemukan `PushSubscription` belum RLS. Ini prioritas
  keamanan berikutnya.
