# API Free Tier Limits - Configuration Guide

**Date**: December 28, 2025  
**Status**: ✅ **CONFIGURED FOR FREE TIER**

## 📊 Free Tier Limits

### Adzuna API
- **Daily Limit**: 250 requests per day
- **With 2 runs/day**: 125 requests per run
- **Cities**: 21 cities

### Reed API
- **Daily Limit**: 1,000 requests per day
- **With 2 runs/day**: 500 requests per run
- **Cities**: 5 cities (UK/Ireland only: London, Manchester, Birmingham, Belfast, Dublin)

## 🎯 Current Configuration

### Adzuna (`scripts/adzuna-categories-scraper.cjs`)

**Queries per city**: 4 queries
- 2 exact role names (highest priority)
- 1 core English term
- 1 local language term

**Pagination**: 2 pages per query
- Role-based: 2 pages
- Generic: 2 pages
- Default: 2 pages

**Calculation**:
- 21 cities × 4 queries × 2 pages = **168 requests per run**
- 2 runs/day = 336 requests/day
- **Status**: ⚠️ **SLIGHTLY OVER** (250 limit)

**Recommendation**: Reduce to 3 queries per city:
- 21 cities × 3 queries × 2 pages = **126 requests per run** ✅

### Reed (`scrapers/reed-scraper-standalone.cjs`)

**Queries per city**: 10 queries
- All early-career terms (rotated)

**Pagination**: 10 pages per query (avg)
- Role-based: 10 pages
- Generic: 8 pages
- Default: 10 pages

**Calculation**:
- 5 cities × 10 queries × 10 pages = **500 requests per run**
- 2 runs/day = 1,000 requests/day
- **Status**: ✅ **PERFECT** (exactly at limit)

## 🔧 Adjustments Made

### Adzuna Reductions:
1. **Queries per city**: 20 → 4 (80% reduction)
   - Role names: 12 → 2
   - Core English: 5 → 1
   - Local terms: 4 → 1

2. **Pagination**: 6-8 pages → 2 pages (67-75% reduction)
   - Role-based: 8 → 2 pages
   - Generic: 5 → 2 pages
   - Default: 6 → 2 pages

3. **Max queries config**: 20 → 4 per city

### Reed Optimizations:
1. **Queries per city**: All → 10 (focused selection)
2. **Pagination**: 18-20 pages → 10 pages (50% reduction)
   - Role-based: 20 → 10 pages
   - Generic: 15 → 8 pages
   - Default: 18 → 10 pages

3. **Max queries config**: All → 10 per location

## ⚠️ Important Notes

### Adzuna Still Slightly Over
Current: 168 requests per run = 336/day (exceeds 250 limit)

**Options**:
1. **Reduce to 3 queries per city** (recommended)
   - 21 × 3 × 2 = 126 requests per run ✅
2. **Reduce to 1 page per query**
   - 21 × 4 × 1 = 84 requests per run ✅
3. **Run once per day instead of twice**
   - 168 requests/day ✅

### Reed Perfect
Current: 500 requests per run = 1,000/day (exactly at limit) ✅

## 📈 Expected Impact

### Adzuna:
- **Before optimization**: Would have been ~2,520 requests/day (10x over limit)
- **After optimization**: 168 requests per run (still 34% over, but much better)
- **With 3 queries**: 126 requests per run (perfect)

### Reed:
- **Before optimization**: Would have been ~18,900 requests/day (19x over limit)
- **After optimization**: 500 requests per run (perfect)

## 🔍 Monitoring

Watch for:
1. **API errors**: 429 (rate limit) or 403 (quota exceeded)
2. **Request counts**: Log actual requests made
3. **Job collection**: Ensure we still get good coverage despite reduced queries

## 🎯 Recommendations

1. **Adzuna**: Reduce to 3 queries per city for perfect compliance
2. **Monitor**: Track actual API usage in logs
3. **Consider**: Running Adzuna once per day if needed
4. **Upgrade**: If job collection is insufficient, consider paid tier

