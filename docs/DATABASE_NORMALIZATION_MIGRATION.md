# Database-Level Normalization Migration

## Overview

This migration creates a **database-level normalization engine** that:
1. ✅ Normalizes existing data (cities, countries, company names)
2. ✅ Prevents dirty data from coming back (via triggers)
3. ✅ Works alongside application-level normalization as a safety net

## Migration File

**Location**: `supabase/migrations/20251229180000_normalize_cities_companies_database_level.sql`

## How to Apply

### Option 1: Via Supabase Dashboard (Recommended - No CLI needed)

1. Go to your Supabase Dashboard: https://supabase.com/dashboard/project/kpecjbjtdjzgkzywylhn
2. Navigate to **SQL Editor**
3. Copy the entire contents of `supabase/migrations/20251229180000_normalize_cities_companies_database_level.sql`
4. Paste and click **Run**
5. ✅ Done! Migration is applied and tracked

### Option 2: Via Supabase CLI (If you set up remote linking)

```bash
# Link to remote project (one-time setup)
supabase link --project-ref kpecjbjtdjzgkzywylhn

# Apply migration
supabase migration up
```

## What This Migration Does

### 1. Normalizes Existing Data

- **Cities**: München → Munich, Praha → Prague, etc.
- **Countries**: Deutschland → Germany, España → Spain, etc.
- **Companies**: Removes legal suffixes (Ltd, Inc, GmbH, etc.)

### 2. Creates Normalization Functions

- `normalize_city_name()` - Normalizes city names
- `clean_company_name()` - Removes legal suffixes

### 3. Creates Triggers (The "Security Guard")

- **`trg_clean_jobs_before_insert`** - Cleans data on INSERT
- **`trg_clean_jobs_before_update`** - Cleans data on UPDATE

These triggers automatically normalize data **before** it's saved, preventing dirty data from multiple sources.

## Benefits

1. **Database-Level Protection** - Even if scrapers miss normalization, database catches it
2. **Automatic Cleaning** - No need to run migrations daily
3. **Consistent Data** - All jobs normalized regardless of source
4. **Works with Existing Code** - Complements your application-level normalization

## Verification

After applying, run these queries:

```sql
-- Check unique cities (should be fewer after normalization)
SELECT COUNT(DISTINCT city) as unique_cities 
FROM jobs 
WHERE city IS NOT NULL;

-- Check top cities
SELECT city, COUNT(*) 
FROM jobs 
WHERE city IS NOT NULL 
GROUP BY city 
ORDER BY COUNT(*) DESC 
LIMIT 20;

-- Check if triggers are working
SELECT trigger_name, event_manipulation, event_object_table
FROM information_schema.triggers
WHERE event_object_table = 'jobs';
```

## Notes

- ✅ Safe to run multiple times (uses WHERE clauses)
- ✅ Works alongside your existing `processor.cjs` normalization
- ✅ Triggers fire automatically on INSERT/UPDATE
- ✅ No performance impact (functions are IMMUTABLE)

