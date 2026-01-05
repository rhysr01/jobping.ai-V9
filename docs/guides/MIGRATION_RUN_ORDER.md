# Migration Run Order

## Critical Security & Data Quality Fixes

Run these migrations in order:

### 1. Complete Job Board Flagging

**File:** `20260102182500_complete_job_board_flagging.sql`

- Flags remaining Reed/Reed Recruitment jobs
- **Status:** ✅ Ready to run

### 2. Enable RLS on Public Tables

**File:** `20260102182501_enable_rls_on_tables.sql`

- Enables Row Level Security on 6 public tables
- Creates basic RLS policies
- **Status:** ✅ Ready to run
- **Note:** Review policies after running - adjust based on your security requirements

### 3. Fix RLS Performance

**File:** `20260102182502_fix_rls_performance.sql`

- Fixes RLS policies that re-evaluate `auth.uid()` per row
- Improves query performance significantly
- **Status:** ✅ Ready to run

### 4. Add Missing Indexes

**File:** `20260102182503_add_missing_indexes.sql`

- Adds indexes for foreign keys
- Improves join performance
- **Status:** ✅ Ready to run

### 5. Fix Function Search Path

**File:** `20260102182504_fix_function_search_path.sql`

- Sets `search_path` for functions to prevent security issues
- **Status:** ✅ Ready to run

### 6. Remove Unused Indexes (OPTIONAL)

**File:** `20260102182505_remove_unused_indexes.sql`

- **Status:** ⚠️ Review before running
- All indexes are commented out - review each one before uncommenting
- Some may be needed for future queries or reporting

## Running Migrations

1. **In Supabase Dashboard:**
   - Go to SQL Editor
   - Copy and paste each migration file content
   - Run in order (1-5)
   - Review migration 6 before running

2. **Using Supabase CLI:**
   ```bash
   supabase db push
   ```

## Verification Queries

After running migrations, verify with:

```sql
-- Check job board flagging
SELECT COUNT(*) FROM jobs
WHERE company IN ('Reed', 'Reed Recruitment')
  AND filtered_reason NOT LIKE '%job_board_as_company%';

-- Check RLS is enabled
SELECT tablename, rowsecurity
FROM pg_tables
WHERE schemaname = 'public'
  AND tablename IN ('free_signups_analytics', 'analytics_events', 'free_sessions',
                    'scraping_priorities', 'custom_scans', 'fallback_match_events');

-- Check indexes were created
SELECT indexname FROM pg_indexes
WHERE tablename IN ('api_key_usage', 'api_keys')
  AND indexname LIKE 'idx_%';
```

## Notes

- **RLS Policies:** The RLS policies created are basic. Review and adjust based on your application's security requirements.
- **Unused Indexes:** Migration 6 is optional. Review each index before removing - some may be needed for future features.
- **Backup:** Always backup your database before running migrations in production.
