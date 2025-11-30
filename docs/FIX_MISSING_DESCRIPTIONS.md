# Fix Missing Job Descriptions

## Problem
**38.9% of active jobs (5,283 jobs) are missing descriptions**, primarily from:
- `jobspy-internships`: 2,444 jobs (80% missing)
- `jobspy-indeed`: 2,320 jobs (67% missing)  
- `jobspy-career-roles`: 519 jobs (71% missing)

## Impact
- **Reduced match quality**: AI matching relies on descriptions for semantic understanding
- **Poor user experience**: Users can't evaluate jobs without descriptions
- **Lower engagement**: Jobs without descriptions are less likely to be clicked

## Root Cause
The scrapers (`jobspy-indeed`, `jobspy-internships`, `jobspy-career-roles`) are not capturing the full job description from the source sites.

## Solutions

### Option 1: Fix Scrapers (Recommended)
Update the scrapers to properly extract descriptions:

**Files to update:**
- `scripts/jobspy-indeed.cjs` (or `jobspy-save.cjs`)
- `scripts/jobspy-internships-only.cjs`
- `scripts/jobspy-career-roles.cjs`

**What to check:**
1. Verify the scraper is accessing the full job description page
2. Check if the description selector is correct for the current page structure
3. Ensure the description field is being saved to the database

**Example fix:**
```javascript
// In the scraper, ensure you're getting the full description
const description = await page.evaluate(() => {
  // Try multiple selectors
  const selectors = [
    '.job-description',
    '[data-testid="job-description"]',
    '.description',
    '#job-description'
  ];
  
  for (const selector of selectors) {
    const element = document.querySelector(selector);
    if (element) {
      return element.innerText || element.textContent;
    }
  }
  return null;
});

if (!description || description.length < 50) {
  console.warn(`⚠️ Missing or short description for job: ${title}`);
}
```

### Option 2: Backfill from Source URLs
For existing jobs, you could:
1. Re-scrape the job URLs to get descriptions
2. Use an API if available (e.g., Adzuna API, Indeed API)
3. Manually review and mark jobs without descriptions as low priority

### Option 3: Filter Out Jobs Without Descriptions
As a temporary measure, filter out jobs without descriptions from matching:

```sql
-- In your matching queries, add:
WHERE description IS NOT NULL 
  AND description != ''
  AND LENGTH(description) > 50
```

## Priority Actions

1. **Immediate**: Update `jobspy-internships-only.cjs` (highest impact - 2,444 jobs)
2. **High**: Update `jobspy-indeed` scraper (2,320 jobs)
3. **Medium**: Update `jobspy-career-roles` (519 jobs)

## Testing
After fixing scrapers:
1. Run a test scrape on a small batch
2. Verify descriptions are being captured
3. Check description length (should be >100 chars typically)
4. Monitor new jobs being added

## Monitoring
Track description completeness:
```sql
SELECT 
    source,
    COUNT(*) as total,
    COUNT(CASE WHEN description IS NOT NULL AND description != '' THEN 1 END) as with_description,
    ROUND(COUNT(CASE WHEN description IS NOT NULL AND description != '' THEN 1 END) * 100.0 / COUNT(*), 2) as percentage
FROM jobs
WHERE is_active = true
GROUP BY source
ORDER BY total DESC;
```

