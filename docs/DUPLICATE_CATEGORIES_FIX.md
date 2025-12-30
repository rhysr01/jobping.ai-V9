# Fix: Jobs with Duplicate Categories (Old + New)

## Problem Discovered

**32 jobs** have **BOTH old and new categories**:
- Example: `["early-career", "sales-business-development", "sales-client-success", "entry-level"]`

This happened because:
1. Migration added new categories (`sales-client-success`)
2. But didn't remove old categories (`sales-business-development`)
3. Jobs now have duplicate/conflicting categories

## Impact

- Jobs match user career paths (new category works)
- But database has duplicate data
- Confusing for debugging and analytics

## Solution

**File**: `MIGRATION_TO_APPLY_NOW.sql`

This migration simply **removes** the old categories since the new ones are already present.

## How to Apply

1. Open Supabase Dashboard → SQL Editor
2. Copy contents of `MIGRATION_TO_APPLY_NOW.sql`
3. Paste and run

## What It Does

Removes old categories from jobs that already have new categories:
- Removes `marketing-advertising` (keeps `marketing-growth`)
- Removes `finance-accounting` (keeps `finance-investment`)
- Removes `sales-business-development` (keeps `sales-client-success`)
- Removes `product-management` (keeps `product-innovation`)

## Verification

After applying, run:
```sql
-- Should return 0 rows
SELECT 
    unnest(categories) as category,
    COUNT(*) as job_count
FROM jobs
WHERE categories && ARRAY['marketing-advertising', 'finance-accounting', 'sales-business-development', 'product-management']::text[]
GROUP BY unnest(categories);
```

---

**Status**: ✅ **READY TO APPLY**

