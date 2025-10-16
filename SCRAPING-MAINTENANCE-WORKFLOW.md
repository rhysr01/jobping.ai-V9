# 🔄 Scraping Maintenance Workflow

Run this workflow **AFTER every scraping session** to maintain database quality.

---

## 📋 Quick Checklist

### 1. Run the Scraper
```bash
# JobSpy scraper
node scripts/jobspy-save.cjs

# Adzuna scraper
node scripts/adzuna-categories-scraper.cjs

# Reed scraper (if needed)
node scrapers/wrappers/reed-scraper-standalone.cjs
```

### 2. Run Post-Scrape Maintenance
```bash
psql $DATABASE_URL -f scripts/post-scrape-maintenance.sql
```

**What it does:**
- ✅ Fixes missing city/country/location data
- ✅ Normalizes all location formats
- ✅ Removes non-target cities
- ✅ Filters senior/manager roles
- ✅ Removes non-business school jobs (healthcare, retail, law, etc.)
- ✅ Applies all 10 career path categories
- ✅ Enriches language requirements
- ✅ Provides stats on new jobs

### 3. Review the Stats
The script will show:
- How many new jobs were kept vs filtered
- New jobs by city
- New jobs by career path
- Overall database health

---

## 🎯 What Gets Filtered Out Automatically

### ❌ Non-Target Cities
Only keeps these 14 cities:
- **UK:** London, Manchester, Birmingham, Belfast
- **Ireland:** Dublin
- **EU:** Paris, Milan, Berlin, Madrid, Amsterdam, Munich, Hamburg, Zurich, Rome, Brussels

### ❌ Senior/Manager Roles
Filters jobs with titles containing:
- senior, manager, director, head of, lead

### ❌ Non-Business School Jobs
Filters:
- Healthcare: nurse, doctor, medical, healthcare
- Manual labor: retail, warehouse, driver, cashier
- Legal: lawyer, solicitor, attorney
- Teaching: teacher, professor, lecturer
- Hospitality: chef, cook, waiter, bartender

---

## 📊 Career Path Categories (10 Total)

The script automatically labels new jobs:

1. **Strategy & Business Design** - consulting, strategy, transformation
2. **Data & Analytics** - data science, business intelligence, analytics
3. **Retail & Luxury** - fashion, luxury, merchandising
4. **Sales & Client Success** - sales, account management, business development
5. **Marketing & Growth** - marketing, brand, communications, PR
6. **Finance & Investment** - banking, finance, accounting, investment
7. **Operations & Supply Chain** - operations, logistics, procurement
8. **Product & Innovation** - product management, R&D, UX
9. **Tech & Transformation** - software engineering, IT, cybersecurity
10. **Sustainability & ESG** - environmental, social impact, climate

---

## 🚨 Troubleshooting

### Issue: Too many jobs filtered out
**Check:** Are scrapers pulling jobs from wrong cities?
**Fix:** Update scraper location filters

### Issue: Jobs not being categorized
**Check:** Are title patterns matching?
**Fix:** Review `post-scrape-maintenance.sql` STEP 3 patterns

### Issue: Missing language requirements
**Fix:** The script auto-infers from country, but you can add manual rules

---

## 📈 Expected Quality Metrics

After running maintenance, your database should maintain:

- ✅ **100%** city data completeness
- ✅ **98%+** country data completeness
- ✅ **90%+** early-career flagged
- ✅ **60%+** career path labeled
- ✅ **80%+** language requirements
- ✅ **70%+** keep rate (30% filtered is normal!)

---

## 🔄 Recommended Schedule

| Scraper | Frequency | Why |
|---------|-----------|-----|
| JobSpy | Daily | Fresh internship/grad roles |
| Adzuna | 2-3x/week | Broader coverage |
| Reed | Weekly | UK-specific roles |

**Always run `post-scrape-maintenance.sql` immediately after!**

---

## 🎯 One-Line Command (After Scraping)

```bash
psql $DATABASE_URL -f scripts/post-scrape-maintenance.sql | tail -50
```

This runs maintenance and shows the summary stats.

---

## ✅ Success Criteria

Your maintenance is working if:
1. New jobs appear in your 14 target cities only
2. No senior/manager roles slip through
3. Career paths are being applied
4. Overall database quality metrics stay above 90%

---

**That's it! Keep this workflow and your database will stay pristine forever.** 🚀

