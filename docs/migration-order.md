# Migration Order - January 2025 Security Fixes

## Migration Sequence

Run these migrations in the following order:

### 1. `20250102_01_fix_rls_security_issues.sql`
- Enables RLS on `custom_scans`, `fallback_match_events`, `scraping_priorities`
- Adds RLS policies for service role access
- Optimizes existing RLS policies for performance
- Fixes function search_path security

### 2. `20250102_02_fix_users_view_security.sql`
- Drops the insecure `public.users` view
- Creates secure function `get_user_profile()` (optional, for future use)

### 3. `20250102_03_create_users_table.sql`
- Creates the actual `public.users` table
- Sets up RLS policies
- Creates indexes
- Sets up email sync trigger

### 4. `20250102_04_backfill_users_table.sql` ⚠️ **REQUIRED**
- **Must run after step 3**
- Backfills existing `auth.users` records into `public.users`
- Creates trigger to auto-create `public.users` for future `auth.users` records
- Creates function to check for orphaned users

## Verification

After running all migrations, verify:

```sql
-- Check that all auth.users have public.users entries
SELECT 
  COUNT(*) as auth_users_count,
  (SELECT COUNT(*) FROM public.users) as public_users_count
FROM auth.users;

-- Should show matching counts (or public_users_count >= auth_users_count)

-- Check for orphaned users
SELECT * FROM public.check_orphaned_auth_users();
-- Should return 0 rows
```

## Rollback

If you need to rollback:

1. The backfill migration is idempotent (safe to re-run)
2. The table creation migration uses `CREATE TABLE IF NOT EXISTS` (safe to re-run)
3. RLS policies can be dropped individually if needed

## Notes

- The backfill migration creates a trigger that automatically creates `public.users` entries when new `auth.users` are created
- This ensures data consistency going forward
- Existing application code should continue to work without changes
