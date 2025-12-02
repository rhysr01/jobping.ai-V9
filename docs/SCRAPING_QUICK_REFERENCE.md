# Scraping Quick Reference

## 🚨 Critical Issues (Fix Immediately)

1. **Adzuna**: Last ran 23 days ago - FIX NOW (52% of jobs!)
2. **Reed**: Last ran 23 days ago - FIX NOW
3. **Missing Cities**: Stockholm, Copenhagen, Prague, Warsaw - ADD NOW

## 📊 Current Performance

### Active Sources ✅
- JobSpy Indeed: 1,572 jobs/week
- JobSpy Internships: 1,226 jobs/week
- JobSpy Career Roles: 732 jobs/week

### Broken Sources 🚨
- Adzuna: 0 jobs/week (should be ~1,500+)
- Reed: 0 jobs/week (should be ~200+)
- Greenhouse: 0 jobs/week (low priority)

## 🎯 Top Cities (Last 7 Days)

1. London: 391 jobs ✅
2. Berlin: 361 jobs ✅
3. Dublin: 289 jobs ✅
4. Zurich: 233 jobs ✅
5. Hamburg: 181 jobs
6. Munich: 175 jobs
7. Madrid: 173 jobs
8. Paris: 156 jobs

## 🔧 Quick Fixes

### Fix Adzuna
```bash
# Test manually
node scrapers/wrappers/adzuna-wrapper.cjs

# Check .env.local for ADZUNA_APP_ID and ADZUNA_APP_KEY
# Verify API quota not exceeded
```

### Fix Reed
```bash
# Test manually
node scrapers/wrappers/reed-wrapper.cjs

# Check .env.local for REED_API_KEY
# Verify API quota not exceeded
```

### Add Missing Cities
Edit `scripts/jobspy-save.cjs` line 546:
```javascript
const cities = [
  // ... existing ...
  'Stockholm', 'Copenhagen', 'Prague', 'Warsaw'  // ADD THESE
];
```

### Reduce Frequency
Edit `automation/real-job-runner.cjs` line 815:
```javascript
// Change from 3x to 2x per day
cron.schedule('0 8,18 * * *', () => {  // Was: '0 8,13,18 * * *'
```

## 📈 Target Metrics

| Metric | Current | Target |
|--------|---------|--------|
| Active Sources | 3 | 5 |
| Cities Covered | 16 | 20 |
| Frequency | 3x/day | 2x/day |
| Cycle Time | ~15min | ~7min |

## 🎯 Priority Actions

### This Week
1. Fix Adzuna scraper
2. Fix Reed scraper
3. Add missing cities
4. Reduce frequency to 2x/day

### Next Week
1. Enable parallelization
2. Add smart stop conditions
3. Set up monitoring/alerts

---

**Full Strategy**: See `SCRAPING_STRATEGY.md`

