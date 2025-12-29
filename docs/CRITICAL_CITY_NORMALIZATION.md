# CRITICAL: City Normalization Migration

## Status: URGENT - Database is read-only, migration needs to be run manually

## Problem
- **612 unique cities** in database (should be ~50-100 major cities)
- Many duplicate variations of the same city:
  - München/Munich (287 jobs)
  - Wien/Vienna (281 jobs)  
  - Praha/Prague (120 jobs)
  - Milano/Milan (117 jobs)
  - Roma/Rome (134 jobs)
  - København/Copenhagen (56 jobs)
  - Zürich/Zurich (183 jobs)
  - And hundreds more variations

## Solution Created
**File**: `migrations/comprehensive_city_normalization.sql`

This migration will:
1. Normalize all major city name variations (native → English)
2. Map suburbs/districts to main cities (e.g., all Paris suburbs → Paris)
3. Remove countries used as cities
4. Remove generic codes (W, Md, Ct)
5. Normalize case and whitespace

## How to Apply

### Option 1: Via Supabase Dashboard (Recommended)
1. Go to your Supabase project dashboard
2. Navigate to SQL Editor
3. Copy the entire contents of `migrations/comprehensive_city_normalization.sql`
4. Paste and execute

### Option 2: Via Supabase CLI
```bash
supabase migration up
```

### Option 3: Via psql
```bash
psql <your-connection-string> -f migrations/comprehensive_city_normalization.sql
```

## Expected Impact

**Before**: 612 unique cities
**After**: ~100-150 unique cities (major cities only)

**Jobs affected**: ~1,500+ jobs will have cities normalized

## Key Normalizations

### Major Cities
- München → Munich (287 jobs)
- Wien → Vienna (281 jobs)
- Praha → Prague (120 jobs)
- Milano → Milan (117 jobs)
- Roma → Rome (134 jobs)
- København → Copenhagen (56 jobs)
- Zürich → Zurich (183 jobs)
- Warszawa → Warsaw (142 jobs)

### Suburbs → Main Cities
- All Paris suburbs → Paris
- All London districts → London
- All Dublin districts → Dublin
- All Barcelona suburbs → Barcelona
- All Madrid suburbs → Madrid
- All Brussels suburbs → Brussels
- All Amsterdam suburbs → Amsterdam
- All Munich suburbs → Munich
- All Milan suburbs → Milan
- All Rome suburbs → Rome

### Countries Removed
- España, Deutschland, Österreich, Nederland, Belgique, Ireland, Schweiz, etc. → NULL

## Verification

After running the migration, verify with:
```sql
SELECT COUNT(DISTINCT city) as unique_cities FROM jobs WHERE city IS NOT NULL;
SELECT city, COUNT(*) FROM jobs WHERE city IS NOT NULL GROUP BY city ORDER BY COUNT(*) DESC LIMIT 50;
```

Expected: Should see ~100-150 unique cities instead of 612.

## Next Steps After Migration

1. Update scrapers to normalize cities at ingestion time
2. Add city normalization to `lib/locationNormalizer.ts`
3. Add validation to prevent future city variations

