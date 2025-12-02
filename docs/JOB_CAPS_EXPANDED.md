# Job Caps Expanded

**Date**: December 2, 2025  
**Status**: ✅ **COMPLETE**

---

## Summary

All job collection caps have been significantly increased to allow more jobs to be scraped and stored.

---

## Changes Made

### 1. Per-Scraper Targets (in `automation/real-job-runner.cjs`)

**Before** → **After**:

| Scraper | Old Cap | New Cap | Increase |
|---------|---------|---------|----------|
| **JobSpy General** | 100 | **500** | 5x |
| **JobSpy Internships** | 80 | **2,000** | 25x |
| **Career Path Roles** | 50 | **3,000** | 60x |
| **Adzuna** | 150 | **500** | 3.3x |
| **Reed** | 50 | **200** | 4x |
| **Greenhouse** | 20 | **100** | 5x |

**Total Potential**: ~6,300 jobs per cycle (up from ~450)

### 2. Individual Scraper Limits

#### JobSpy (`scripts/jobspy-save.cjs`)
- **RESULTS_WANTED**: 15 → **50** per query (3.3x increase)
- **Impact**: More results per search query

#### Reed (`scrapers/reed-scraper-standalone.cjs`)
- **MAX_PAGES**: 10 → **20** per location (2x increase)
- **RESULTS_PER_PAGE**: 50 (unchanged)
- **Impact**: Up to 1,000 jobs per location (was 500)

#### Adzuna (`scripts/adzuna-categories-scraper.cjs`)
- **RESULTS_PER_PAGE**: 25 → **50** (2x increase)
- **MAX_PAGES**: 3 → **5** (1.67x increase)
- **Impact**: Up to 250 jobs per query per city (was 75)

### 3. Global Cycle Target

- **Status**: Remains at **0** (no limit)
- **Note**: Set to 0 to disable quota and run all scrapers

---

## Expected Impact

### Before Expansion
- **Per Cycle**: ~450-500 jobs max
- **JobSpy Internships**: Limited to 80 jobs
- **Career Path Roles**: Limited to 50 jobs
- **Adzuna**: Limited to 150 jobs

### After Expansion
- **Per Cycle**: Up to **6,300+ jobs** potential
- **JobSpy Internships**: Up to 2,000 jobs
- **Career Path Roles**: Up to 3,000 jobs
- **Adzuna**: Up to 500 jobs
- **Reed**: Up to 200 jobs

### Realistic Expectations

Based on recent run results:
- **Career Path Roles**: Found 2,311 jobs (was capped at 50) → Now can collect all
- **JobSpy Internships**: Found 1,963 jobs (was capped at 80) → Now can collect all
- **Adzuna**: Found 243 jobs (was capped at 150) → Now can collect more

**Expected**: **3,000-5,000 unique jobs per cycle** (up from ~500)

---

## Configuration

All caps can be overridden via environment variables:

```bash
# Per-scraper targets
JOBSPY_TARGET=500
JOBSPY_INTERNSHIPS_TARGET=2000
JOBSPY_CAREER_TARGET=3000
ADZUNA_TARGET=500
REED_TARGET=200
GREENHOUSE_TARGET=100

# Individual scraper limits
JOBSPY_RESULTS_WANTED=50
REED_MAX_PAGES=20
ADZUNA_RESULTS_PER_PAGE=50
ADZUNA_MAX_PAGES=5

# Global cycle target (0 = no limit)
SCRAPER_CYCLE_JOB_TARGET=0
```

---

## Notes

1. **API Limits**: Be aware of API rate limits:
   - Adzuna: 250 calls/day (already optimized)
   - Reed: No strict limit mentioned
   - JobSpy: Uses free tier (may have limits)

2. **Database**: Ensure database can handle increased volume

3. **Performance**: Cycle time may increase slightly with more jobs

4. **Deduplication**: Job hash deduplication still works (prevents duplicates)

---

**Status**: ✅ **EXPANDED** - Ready for next run

