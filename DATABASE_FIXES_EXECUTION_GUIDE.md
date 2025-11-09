# Database Critical Fixes - Execution Guide

## Overview
All migration files and scripts have been created. Since MCP is in read-only mode, you'll need to execute these manually in your Supabase SQL editor.

## Execution Order

### Phase 1: Security Fixes (CRITICAL - Do First)

1. **Enable RLS** (`migrations/enable_rls_security.sql`)
   - Run this first to enable Row Level Security on critical tables
   - ⚠️ Test your API endpoints after this to ensure they still work

2. **Fix Function Search Path** (`migrations/fix_function_search_path.sql`)
   - Sets search_path for all functions to prevent SQL injection
   - Safe to run, no breaking changes

3. **Consolidate RLS Policies** (`migrations/consolidate_rls_policies.sql`)
   - Merges duplicate policies for better performance
   - ⚠️ Test API endpoints after this

### Phase 2: Data Quality Fixes

4. **Backfill Location Data** (`migrations/backfill_location_data.sql`)
   - Creates function `parse_and_update_location()` and executes it
   - Fills missing city/country from location field
   - Updates ~2,159 jobs

5. **Fix Work Environment** (`migrations/fix_work_environment.sql`)
   - Creates function `fix_work_environment()` and executes it
   - Detects remote/hybrid from location/description
   - Updates ~12,768 jobs

6. **Backfill Descriptions** (`scripts/backfill_descriptions.ts`)
   - Run with: `npx tsx scripts/backfill_descriptions.ts`
   - Fills missing descriptions with placeholder
   - Updates ~4,429 jobs

7. **Enrich Short Descriptions** (`scripts/enrich_short_descriptions.ts`)
   - Run with: `npx tsx scripts/enrich_short_descriptions.ts`
   - Logs short descriptions for manual review
   - Currently doesn't auto-expand (to avoid low-quality content)

### Phase 3: Categorization & Embeddings

8. **Activate Categorization Trigger** (`scripts/create-auto-categorization-trigger.sql`)
   - Verify trigger exists, if not run this script
   - Ensures new jobs are automatically categorized

9. **Backfill Categories** (`migrations/backfill_job_categories.sql`)
   - Creates function `backfill_job_categories()` and executes it
   - Categorizes Sales, Tech, Product, ESG jobs
   - Updates all jobs with missing categories

10. **Generate Embeddings** (`scripts/generate_all_embeddings.ts`)
    - Run with: `npx tsx scripts/generate_all_embeddings.ts`
    - Processes in batches of 1000
    - Estimated cost: ~$0.25 for 12,805 jobs
    - ⚠️ Requires OPENAI_API_KEY environment variable

### Phase 4: Performance Optimization

11. **Remove Unused Indexes** (`migrations/remove_unused_indexes.sql`)
    - ⚠️ **IMPORTANT**: Review index usage first before dropping
    - Run the verification query in the file to see which indexes are unused
    - Only drop indexes with `idx_scan = 0` (never used)
    - Most index drops are commented out - uncomment after verification

### Phase 5: Verification

12. **Quick Verification** (`scripts/quick_verification.sql`)
    - Run this to quickly check all fixes
    - Should show:
      - RLS enabled on all tables
      - Functions have search_path set
      - City coverage > 90%
      - Work environment balanced (not 88% on-site)
      - Embeddings coverage = 100%
      - Categories exist for Sales/Tech/Product/ESG
      - Descriptions coverage > 95%

13. **Full Verification** (`scripts/verify_database_fixes.sql`)
    - Comprehensive verification script
    - Shows detailed stats for all fixes

## Quick Start

```bash
# 1. Run security migrations in Supabase SQL editor (in order):
#    - migrations/enable_rls_security.sql
#    - migrations/fix_function_search_path.sql
#    - migrations/consolidate_rls_policies.sql

# 2. Run data quality migrations:
#    - migrations/backfill_location_data.sql
#    - migrations/fix_work_environment.sql

# 3. Run TypeScript scripts:
npx tsx scripts/backfill_descriptions.ts
npx tsx scripts/enrich_short_descriptions.ts

# 4. Run categorization:
#    - Verify trigger exists, if not: scripts/create-auto-categorization-trigger.sql
#    - migrations/backfill_job_categories.sql

# 5. Generate embeddings (requires OPENAI_API_KEY):
npx tsx scripts/generate_all_embeddings.ts

# 6. Verify everything:
#    Run scripts/quick_verification.sql in Supabase SQL editor
```

## Notes

- **RLS Enablement**: After enabling RLS, test your API endpoints immediately. The existing policies should allow service_role access, but verify.
- **Embeddings**: The embedding generation script processes in batches and includes rate limiting. It will take ~30-60 minutes for 12,805 jobs.
- **Index Removal**: Be very careful with index removal. Always verify they're unused first using the query in `remove_unused_indexes.sql`.
- **Rollback**: All migrations are idempotent (safe to run multiple times). If you need to rollback RLS, you can disable it with `ALTER TABLE ... DISABLE ROW LEVEL SECURITY`.

## Files Created

### Migration Files (SQL - Run in Supabase SQL Editor):
- `migrations/enable_rls_security.sql`
- `migrations/fix_function_search_path.sql`
- `migrations/consolidate_rls_policies.sql`
- `migrations/backfill_location_data.sql`
- `migrations/fix_work_environment.sql`
- `migrations/backfill_job_categories.sql`
- `migrations/remove_unused_indexes.sql`

### Script Files (TypeScript - Run with npx tsx):
- `scripts/backfill_descriptions.ts`
- `scripts/enrich_short_descriptions.ts`
- `scripts/generate_all_embeddings.ts`

### Verification Files (SQL - Run in Supabase SQL Editor):
- `scripts/verify_database_fixes.sql`
- `scripts/quick_verification.sql`

## Expected Results

After running all fixes:
- ✅ RLS enabled on jobs, users, matches
- ✅ All functions have search_path set
- ✅ City coverage: >90%
- ✅ Country coverage: >90%
- ✅ Work environment: Balanced distribution
- ✅ Descriptions coverage: >95%
- ✅ Embeddings coverage: 100%
- ✅ Categories: Sales/Tech/Product/ESG all have jobs
- ✅ Performance: Consolidated policies, unused indexes removed

