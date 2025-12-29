# City Normalization Prevention - Implementation Complete

## Problem
City names were being saved with variations (Wien/Vienna, München/Munich, Praha/Prague, etc.), causing fragmentation in the database with 612+ unique cities instead of ~100-150 major cities.

## Solution Implemented

### 1. Enhanced Location Normalizers
Updated both location normalizers to automatically normalize city names at ingestion:

- **`lib/locationNormalizer.ts`** (TypeScript - used in API routes)
- **`scrapers/shared/locationNormalizer.cjs`** (CommonJS - used in scrapers)

### 2. City Name Mapping
Added comprehensive `CITY_NORMALIZATION_MAP` that maps:
- **Native names → English standard**: Wien → Vienna, München → Munich, Praha → Prague
- **Suburbs → Main cities**: All Paris suburbs → Paris, All London districts → London
- **District variations**: Praha 1-10 → Prague, Dublin 1-14 → Dublin
- **Country names**: Rejected (return empty string)

### 3. Automatic Normalization
The `normalizeCity()` function now:
1. Checks for known variations (case-insensitive)
2. Handles district patterns (e.g., "Praha 5" → "Prague")
3. Rejects country names (returns empty string)
4. Falls back to proper capitalization if no mapping found

### 4. Country Name Rejection
Enhanced `normalizeCountry()` to reject country names when used incorrectly, preventing countries from being saved as city names.

## How It Works

### At Job Ingestion
When a job is scraped and saved:
1. Location data goes through `normalizeJobLocation()` 
2. City name is normalized via `normalizeCity()`
3. Variations are automatically mapped to canonical names
4. Country names are rejected if used as cities

### Example Transformations
```
"Wien" → "Vienna"
"München" → "Munich"  
"Praha 5" → "Prague"
"Bruxelles" → "Brussels"
"København" → "Copenhagen"
"Warszawa" → "Warsaw"
"Österreich" → "" (rejected - country name)
```

## Files Modified

1. **`lib/locationNormalizer.ts`**
   - Added `CITY_NORMALIZATION_MAP` with 200+ city variations
   - Enhanced `normalizeCity()` function
   - Enhanced `normalizeCountry()` to reject countries

2. **`scrapers/shared/locationNormalizer.cjs`**
   - Added `CITY_NORMALIZATION_MAP` with 200+ city variations
   - Enhanced `normalizeCity()` function
   - Enhanced `normalizeCountry()` to reject countries

## Testing

All scrapers that use `processIncomingJob()` automatically benefit from this normalization since it calls `normalizeJobLocation()`.

## Future Maintenance

If new city variations appear:
1. Add them to `CITY_NORMALIZATION_MAP` in both files
2. Keep the maps synchronized between TypeScript and CommonJS versions
3. Test with actual scraped data

## Impact

✅ **Prevents future city fragmentation**
✅ **Automatic normalization at ingestion**
✅ **No manual database cleanup needed**
✅ **Consistent city names across all scrapers**

