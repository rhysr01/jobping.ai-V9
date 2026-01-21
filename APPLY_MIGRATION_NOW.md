# ✅ Ready to Apply Migration

## Migration Status

The migration `20260121_create_pending_digests_table.sql` is ready and will be applied along with other pending migrations.

**Dry-run shows these migrations will be pushed:**
- ✅ `20250102_backfill_users_table.sql`
- ✅ `20250102_create_users_table.sql`
- ✅ `20250102_fix_rls_security_issues.sql`
- ✅ `20250102_fix_users_view_security.sql`
- ✅ `20260120000000_add_filtered_reason_column.sql`
- ✅ **`20260121_create_pending_digests_table.sql`** ← Your new migration

---

## Apply Migration

Run this command to apply all pending migrations:

```bash
supabase db push --include-all
```

**Note:** This will apply ALL pending migrations listed above. If you only want to apply the pending_digests migration, you can:

1. Apply via Supabase Dashboard SQL Editor (copy/paste the migration file)
2. Or wait until other migrations are applied first

---

## Verify After Application

After applying, verify the table exists:

```sql
SELECT EXISTS (
  SELECT FROM information_schema.tables 
  WHERE table_schema = 'public' 
  AND table_name = 'pending_digests'
);
-- Should return: true
```

---

## What This Migration Creates

- ✅ `pending_digests` table
- ✅ 3 performance indexes
- ✅ RLS enabled with service role policy
- ✅ Email validation constraint
- ✅ JSONB array validation

---

## After Migration

Once applied:
- ✅ `/api/cron/process-digests` will no longer return 404 errors
- ✅ Digest email processing will work correctly
- ✅ Premium users can receive scheduled digest emails
