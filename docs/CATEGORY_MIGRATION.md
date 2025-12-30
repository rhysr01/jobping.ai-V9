# Category Name Migration
**Date**: December 29, 2025

## Overview

This migration updates old category names in the `jobs` table to match the new category naming convention used in `categoryMapper.ts`.

## Category Mappings

| Old Category | New Category | Jobs Affected |
|--------------|--------------|---------------|
| `marketing-advertising` | `marketing-growth` | 368 |
| `finance-accounting` | `finance-investment` | 361 |
| `sales-business-development` | `sales-client-success` | 319 |
| `product-management` | `product-innovation` | 23 |
| **Total Unique Jobs** | | **983** |

*Note: Some jobs have multiple old categories, so the total unique jobs is less than the sum of individual counts.*

## Why This Migration is Needed

The scrapers were previously using old category names that don't match the `categoryMapper.ts` mappings. This caused jobs to not match users' selected career paths.

**Example**: A user selects "Finance" career path → expects jobs with `finance-investment` category, but old jobs have `finance-accounting` category → no match.

## Migration File

**Location**: `supabase/migrations/20251229200000_migrate_old_category_names.sql`

## How to Apply

### Option 1: Via Supabase CLI (Recommended)
```bash
cd /Users/rhysrowlands/jobping
supabase migration up
```

### Option 2: Via Supabase Dashboard
1. Open Supabase Dashboard → SQL Editor
2. Copy contents of `supabase/migrations/20251229200000_migrate_old_category_names.sql`
3. Paste and run

## Verification

After applying the migration, run this query to verify:

```sql
-- Should return 0 rows
SELECT 
    unnest(categories) as category,
    COUNT(*) as job_count
FROM jobs
WHERE categories && ARRAY['marketing-advertising', 'finance-accounting', 'sales-business-development', 'product-management']::text[]
GROUP BY unnest(categories)
ORDER BY job_count DESC;
```

## Expected Results

- ✅ All old category names replaced with new ones
- ✅ 983 unique jobs updated (some jobs have multiple old categories)
- ✅ Jobs will now match user career paths correctly
- ✅ No data loss (categories are replaced, not removed)

## Rollback

If needed, you can rollback by reversing the mappings:

```sql
UPDATE jobs SET categories = array_replace(categories, 'marketing-growth', 'marketing-advertising') WHERE 'marketing-growth' = ANY(categories);
UPDATE jobs SET categories = array_replace(categories, 'finance-investment', 'finance-accounting') WHERE 'finance-investment' = ANY(categories);
UPDATE jobs SET categories = array_replace(categories, 'sales-client-success', 'sales-business-development') WHERE 'sales-client-success' = ANY(categories);
UPDATE jobs SET categories = array_replace(categories, 'product-innovation', 'product-management') WHERE 'product-innovation' = ANY(categories);
```

---

**Status**: ✅ **READY TO APPLY**

