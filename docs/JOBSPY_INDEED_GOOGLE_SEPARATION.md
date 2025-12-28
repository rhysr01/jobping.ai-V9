# JobSpy Indeed/Google Separation Optimization

**Date**: December 28, 2025  
**Status**: ✅ **IMPLEMENTED**

## 🎯 Overview

Optimized `scripts/jobspy-save.cjs` to treat Indeed and Google as two separate search engines with different parameter strategies, maximizing yield and preventing rate limiting.

## 🔧 Key Changes

### 1. **Split-Brain Parameter Strategy**

**Indeed (Part A)** - Structured Search:
- Uses `search_term` + `location` + `country_indeed` parameters
- Includes: `indeed`, `zip_recruiter`, `glassdoor` (where available)
- Relies on JobSpy's built-in filters for geo-targeting

**Google (Part B)** - Natural Language Search:
- Uses `google_search_term` parameter only
- Location baked directly into search string: `"jobs in ${city}, ${countryName}"`
- Ignores `location` and `country_indeed` parameters (Google doesn't use them)

### 2. **Semantic Synonym Merger**

Instead of separate API calls for "Intern" and "Stagiaire", Google queries now merge synonyms:
```
"intern" OR "praktikant" OR "stagiaire" OR "prácticas" jobs in Paris, France -senior -lead
```

**Benefits**:
- **3x data yield per API credit** (one call instead of multiple)
- Catches roles titled in local language but described in English
- More comprehensive results

### 3. **Year Filter for Better Targeting**

Added year filter for internships/graduate programs:
```javascript
const yearFilter = (termLower.includes('intern') || termLower.includes('graduate') || termLower.includes('entry level'))
  ? ' (2025 OR 2026)'
  : '';
```

This targets current recruitment cycles (2025/2026 programs).

### 4. **IP Health & Rate Limiting**

- **5-second cooldown** after every Google call
- **1-second pause** between cities
- Simulates human-like search cadence to avoid bot detection

## 📊 Implementation Details

### Code Structure

```javascript
for (const city of cities) {
  for (const term of toRun) {
    // PART A: Indeed (structured)
    await runJobSpyScraper(indeedPython, 'Indeed');
    
    // PART B: Google (natural language with merged synonyms)
    await runJobSpyScraper(googlePython, 'Google');
    
    // Rate limit protection
    await new Promise(resolve => setTimeout(resolve, 5000));
  }
}
```

### Helper Function

Created `runJobSpyScraper()` helper function that:
- Handles retry logic with exponential backoff
- Filters expected errors (GDPR/Geo restrictions)
- Parses CSV results and adds to `collected` array
- Returns row count for logging

### Synonym Matching Logic

Local synonyms are matched conceptually:
- **Intern/Internship** → `praktik`, `stage`, `stagiaire`, `prácticas`, `tirocinio`, `staż`
- **Graduate/Entry Level** → `absolvent`, `absolwent`, `nyexaminerad`, `neolaureato`, `recién graduado`
- **Junior** → `junior`, `débutant`, `beginnend`, `primo lavoro`, `nivel inicial`
- **Trainee** → `trainee`, `praktikant`, `stagiaire`, `becario`, `tirocinio`
- **Coordinator/Assistant/Analyst** → relevant local terms

## 🎯 Expected Results

### Performance Improvements
- **Reduced API calls**: Merged synonyms = fewer Google queries
- **Better yield**: OR queries catch more results
- **Rate limit protection**: 5s cooldown prevents IP blocking
- **Cleaner logs**: Separate Indeed/Google logging

### Data Quality
- **More comprehensive**: Local language roles included
- **Better targeting**: Year filters for current recruitment cycles
- **Fewer duplicates**: Same `onConflict: 'job_hash'` logic preserved

## 🔍 Testing Recommendations

1. **Monitor Google rate limits**: Watch for 429 errors
2. **Check yield**: Compare results before/after (should see 2-3x increase)
3. **Verify synonym matching**: Check that local terms are being merged correctly
4. **Test cooldown**: Ensure 5s delay is working (check logs)

## 📝 Notes

- **Glassdoor blocking**: Still handled (skipped for Stockholm, Copenhagen, Prague, Warsaw)
- **ZipRecruiter removed**: No longer included in site list (was causing 403 errors)
- **Quality filtering**: Unchanged (same business axis, early-career, noise filtering)
- **Database saves**: Same `onConflict: 'job_hash'` logic
- **Error handling**: Enhanced with separate Indeed/Google error tracking

## ⏱️ Execution Time Considerations

### Time Calculation
- **21 cities** × **~8 queries per city** × **5s Google cooldown** = **~840 seconds (14 minutes)** of idle waiting time
- **Plus actual scraping time**: ~15-20 minutes (Indeed + Google API calls)
- **Plus 1s pause between cities**: 21 seconds
- **Total estimated time**: ~30-45 minutes

### GitHub Actions Timeout
- Current timeout: **120 minutes (2 hours)** ✅
- This provides comfortable buffer for:
  - Network delays
  - Retry attempts
  - Multiple scrapers running in sequence
  - Database save operations

### Monitoring
Watch the "Execution Time" log in GitHub Actions to ensure:
- Runs complete within 45-60 minutes
- No timeout issues
- Cooldown delays are working correctly

## 🚀 Next Steps

1. Monitor next GitHub Actions run for results
2. Adjust synonym matching if needed (based on actual results)
3. Fine-tune year filter if 2025/2026 becomes outdated
4. Consider adding more local synonyms based on yield analysis

