# ⚠️ URGENT: Migration Needed - Old Categories Still Present

## Problem

**87 jobs created TODAY (Dec 29, 2025)** still have old category names:
- `marketing-advertising`: 30 jobs
- `finance-accounting`: 22 jobs  
- `sales-business-development`: 33 jobs
- `product-management`: 2 jobs

**Source**: All from `jobspy-indeed`

## Root Cause

The scraper code has been fixed, but:
1. **Migration hasn't been applied yet** - Old jobs still have old categories
2. **New jobs created today** - These were created before the scraper fix was deployed, OR there's a caching issue

## Immediate Action Required

### Step 1: Apply Migration NOW

**Option A: Via Supabase Dashboard** (Fastest)
1. Open Supabase Dashboard → SQL Editor
2. Copy contents of `MIGRATION_TO_APPLY_NOW.sql`
3. Paste and run

**Option B: Via Supabase CLI**
```bash
cd /Users/rhysrowlands/jobping
supabase migration up
```

### Step 2: Verify Migration

Run this query (should return 0 rows):
```sql
SELECT 
    unnest(categories) as category,
    COUNT(*) as job_count
FROM jobs
WHERE categories && ARRAY['marketing-advertising', 'finance-accounting', 'sales-business-development', 'product-management']::text[]
GROUP BY unnest(categories)
ORDER BY job_count DESC;
```

### Step 3: Verify Scraper Fix

Check that `scripts/jobspy-save.cjs` is using new category names:
- ✅ `'finance': 'finance-investment'` (line 576)
- ✅ `'sales': 'sales-client-success'` (line 577)
- ✅ `'marketing': 'marketing-growth'` (line 578)
- ✅ `'product': 'product-innovation'` (line 579)

## Impact

**Before Migration**:
- ❌ 87 jobs won't match user career paths
- ❌ Users selecting "Finance" won't see jobs with `finance-accounting` category

**After Migration**:
- ✅ All jobs will match user career paths correctly
- ✅ Consistent category naming across all jobs

## Files

- **Migration File**: `supabase/migrations/20251229200000_migrate_old_category_names.sql`
- **Quick Fix**: `MIGRATION_TO_APPLY_NOW.sql` (copy-paste ready)

---

**Status**: ⚠️ **URGENT - APPLY MIGRATION NOW**

