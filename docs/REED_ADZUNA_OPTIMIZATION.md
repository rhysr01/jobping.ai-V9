# Reed & Adzuna Optimization - Increased Job Collection

**Date**: December 28, 2025  
**Status**: ✅ **IMPLEMENTED**

## 🎯 Problem

Reed and Adzuna scrapers were collecting very few jobs despite having good API access and no rate limits.

## 🔧 Root Causes Identified

### Adzuna Issues:
1. **Query limit too low**: Only 10 queries per city (limited in `generateCityQueries`)
2. **Pagination too conservative**: 5 pages for roles, 3 for generic (missing many results)
3. **Role coverage limited**: Only 6 role names per city (should be 12+)

### Reed Issues:
1. **Pagination too conservative**: 15 pages for roles, 10 for generic (could be higher)
2. **Over-aggressive filtering**: Required both `classifyEarlyCareer()` AND title match, rejecting valid jobs
3. **API already filters**: Reed API uses `graduate: true` filter, so additional filtering was redundant

## ✅ Optimizations Applied

### Adzuna Improvements:

1. **Increased queries per city**: 10 → 20 queries
   - Role names: 6 → 12 (doubled)
   - Core English terms: 2 → 5 (increased)
   - Local language terms: 2 → 4 (doubled)

2. **Increased pagination**:
   - Role-based queries: 5 → 8 pages (+60%)
   - Generic queries: 3 → 5 pages (+67%)
   - Default: 4 → 6 pages (+50%)

3. **Increased max queries config**: 15 → 20 per city

### Reed Improvements:

1. **Increased pagination**:
   - Role-based queries: 15 → 20 pages (+33%)
   - Generic queries: 10 → 15 pages (+50%)
   - Default: 12 → 18 pages (+50%)

2. **Relaxed filtering**:
   - **Before**: Required `classifyEarlyCareer()` OR title match with EARLY_TERMS
   - **After**: Only rejects clearly senior roles (has senior/lead/director AND no junior/graduate/intern)
   - **Rationale**: Reed API already uses `graduate: true` filter, so we trust it more

## 📊 Expected Impact

### Adzuna:
- **Before**: ~10 queries × 4 pages × 50 results = ~2,000 potential results per city
- **After**: ~20 queries × 6 pages × 50 results = ~6,000 potential results per city
- **Expected increase**: 2-3x more jobs collected

### Reed:
- **Before**: ~50 queries × 12 pages × 50 results = ~30,000 potential results per city
- **After**: ~50 queries × 18 pages × 50 results = ~45,000 potential results per city
- **Expected increase**: 1.5x more jobs collected (with relaxed filtering, could be 2x)

## 🎯 Key Changes

### Adzuna (`scripts/adzuna-categories-scraper.cjs`):
```javascript
// Queries per city: 10 → 20
queries.push(...uniqueRoles.slice(0, 12)); // Was 6
queries.push(...CORE_ENGLISH_TERMS.slice(0, 5)); // Was 2
queries.push(...prioritizedLocal.slice(0, 4)); // Was 2
const limitedQueries = [...new Set(queries)].slice(0, 20); // Was 10

// Pagination: Increased across the board
ADZUNA_MAX_PAGES_ROLE: 5 → 8
ADZUNA_MAX_PAGES_GENERIC: 3 → 5
ADZUNA_MAX_PAGES: 4 → 6
ADZUNA_MAX_QUERIES_PER_CITY: 15 → 20
```

### Reed (`scrapers/reed-scraper-standalone.cjs`):
```javascript
// Pagination: Increased across the board
REED_MAX_PAGES_ROLE: 15 → 20
REED_MAX_PAGES_GENERIC: 10 → 15
REED_MAX_PAGES: 12 → 18

// Filtering: Relaxed (trust API more)
// Before: Required classifyEarlyCareer() OR title match
// After: Only reject clearly senior roles
```

## 🔍 Monitoring

Watch for:
1. **Adzuna**: Should see 2-3x increase in jobs collected
2. **Reed**: Should see 1.5-2x increase in jobs collected
3. **Quality**: Ensure relaxed filtering doesn't introduce too many senior roles
4. **API errors**: Monitor for rate limits or API issues

## 📝 Notes

- **No API limits**: Both Reed and Adzuna have generous/no API limits, so we can be aggressive
- **Quality maintained**: Relaxed filtering still rejects clearly senior roles
- **Graduate filter**: Reed's `graduate: true` API parameter already filters, so we trust it more
- **Pagination**: More pages = more results, especially for role-based queries

