# Concept Batching Optimization - 70% Reduction in API Calls

**Date**: December 28, 2025  
**Status**: ✅ **IMPLEMENTED**

## 🎯 Problem

The previous implementation was making **20+ individual API calls per city** (one per search term), causing:
- **43-minute runtime bottleneck**
- Excessive overhead from launching Python processes
- Unnecessary API rate limit pressure
- Poor performance scaling

**The Math**: 21 cities × 20 terms × 2 search engines = **840+ API calls** per run

## ✅ Solution: Concept Batching

Instead of searching for each keyword separately, we now **collapse related terms into merged OR queries**. This allows **one API call to do the work of 5-7 individual calls**.

### Before (Per-Term Approach):
```javascript
for (const term of toRun) {  // 20+ iterations
  // Indeed call for "intern"
  // Google call for "intern"
  // Indeed call for "internship"
  // Google call for "internship"
  // ... (20+ more)
}
```

### After (Concept Batching):
```javascript
const batches = {
  internships: `("intern" OR "internship" OR "praktikant" OR "stagiaire" OR "placement")`,
  graduates: `("graduate" OR "junior" OR "entry level" OR "absolvent" OR "nyexaminerad")`,
  specialized: `("analyst" OR "associate" OR "trainee" OR "coordinator" OR "assistant")`
};

for (const [batchName, baseQuery] of Object.entries(batches)) {  // 3 iterations
  // Indeed call for entire batch
  // Google call for entire batch
}
```

## 📊 Performance Impact

### API Calls Reduction:
- **Before**: 21 cities × 20 terms × 2 engines = **840 calls**
- **After**: 21 cities × 3 batches × 2 engines = **126 calls**
- **Reduction**: **85% fewer API calls** 🚀

### Runtime Improvement:
- **Before**: ~43 minutes (with 5s cooldowns)
- **After**: ~7-10 minutes (estimated)
- **Improvement**: **~75% faster** ⚡

## 🔧 Implementation Details

### Three Concept Batches:

1. **Internships Batch**:
   - English: `intern`, `internship`, `placement`
   - Local: `praktikant`, `stagiaire`, `prácticas`, `tirocinio`, `staż`
   - Year filter: `(2025 OR 2026)` ✅

2. **Graduates Batch**:
   - English: `graduate`, `junior`, `entry level`, `recent graduate`, `new grad`
   - Local: `absolvent`, `absolwent`, `nyexaminerad`, `neolaureato`, `recién graduado`, etc.
   - Year filter: `(2025 OR 2026)` ✅

3. **Specialized Batch**:
   - English: `analyst`, `associate`, `trainee`, `coordinator`, `assistant`
   - Local: `koordinator`, `assistent`, `asistente`, `analyst`, etc.
   - No year filter (not time-sensitive)

### Local Synonym Merging:
Each batch automatically includes relevant local-language synonyms from `CITY_LOCAL`, ensuring we catch roles listed in local languages (e.g., "Stagiaire" in Paris, "Praktikant" in Berlin).

## 🧹 Database Cleanup

Added automatic cleanup at the start of each run:
- **Deletes jobs older than 30 days** before scraping
- Prevents database bloat with "ghost jobs"
- Keeps database size manageable

## 🎯 Year Targeting

Google queries for internships and graduates now include:
```
(2025 OR 2026)
```

This targets current recruitment cycles and filters out outdated postings.

## 📈 Expected Results

### Coverage:
- **Same job coverage** (OR queries catch all relevant roles)
- **Better multilingual coverage** (local synonyms merged)
- **Current recruitment cycles** (2025/2026 filter)

### Performance:
- **85% fewer API calls**
- **75% faster runtime**
- **Same or better job yield**

## 🔍 Monitoring

Watch for:
1. **Job yield**: Should remain similar or improve (OR queries are more comprehensive)
2. **Runtime**: Should drop from ~43min to ~7-10min
3. **API errors**: Should decrease (fewer calls = less rate limit pressure)
4. **Database size**: Should stabilize (30-day cleanup)

## 📝 Notes

- **All 21 cities** are still processed (no reduction in coverage)
- **Quality filtering** remains unchanged
- **Error handling** and retries still work
- **Rate limiting** (5s cooldown) still applies after Google calls

## 🚀 Next Steps

1. Monitor the next GitHub Actions run for performance improvement
2. Verify job yield remains high (OR queries should catch more, not less)
3. Adjust batch composition if needed based on results
4. Consider adding more batches if specific role types need separate targeting

