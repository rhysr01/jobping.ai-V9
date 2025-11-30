# Backfill Missing Job Descriptions

## Overview
This script re-scrapes job URLs to fetch descriptions for jobs that are missing them. It processes jobs in batches and updates the database with fetched descriptions.

## Prerequisites

### Python Dependencies
The script requires Python with the following packages:
```bash
pip install requests beautifulsoup4
```

### Environment Variables
Make sure `.env.local` has:
- `SUPABASE_URL`
- `SUPABASE_SERVICE_ROLE_KEY`

## Usage

### Basic Usage
```bash
node scripts/backfill-descriptions-from-urls.cjs
```

### With Custom Settings
```bash
# Process up to 500 jobs, 2 second delay between requests
BACKFILL_MAX_JOBS=500 BACKFILL_DELAY_MS=2000 node scripts/backfill-descriptions-from-urls.cjs

# Process in batches of 100
BACKFILL_BATCH_SIZE=100 node scripts/backfill-descriptions-from-urls.cjs
```

### Environment Variables
- `BACKFILL_MAX_JOBS` - Maximum number of jobs to process (default: 1000)
- `BACKFILL_BATCH_SIZE` - Number of jobs to update in each batch (default: 50)
- `BACKFILL_DELAY_MS` - Delay between requests in milliseconds (default: 2000)

## How It Works

1. **Fetches jobs** missing descriptions from the database
2. **Scrapes each URL** using Python with requests/BeautifulSoup
3. **Extracts description** using common job description selectors
4. **Updates database** in batches to avoid overwhelming the database
5. **Provides progress** tracking and summary statistics

## What It Does

- ✅ Fetches descriptions from job URLs
- ✅ Handles rate limiting (2 second delay between requests)
- ✅ Processes in batches for efficiency
- ✅ Provides detailed progress logging
- ✅ Skips jobs that already have descriptions
- ✅ Handles errors gracefully

## Expected Results

Based on current data:
- **jobspy-internships**: ~2,477 jobs missing descriptions (80.71%)
- **jobspy-indeed**: ~2,351 jobs missing descriptions (72.29%)
- **jobspy-career-roles**: ~529 jobs missing descriptions (72.27%)

**Total**: ~5,357 jobs need descriptions

## Success Rate

The success rate depends on:
- Whether job URLs are still valid
- Whether job sites allow scraping
- Whether job descriptions are accessible

Expected success rate: **60-80%** (some URLs may be expired or blocked)

## Monitoring

The script provides:
- Real-time progress updates
- Success/failure counts
- Summary statistics at the end

## Troubleshooting

### "ModuleNotFoundError: No module named 'requests'"
```bash
pip install requests beautifulsoup4
```

### "Timeout errors"
Increase the delay between requests:
```bash
BACKFILL_DELAY_MS=5000 node scripts/backfill-descriptions-from-urls.cjs
```

### "Rate limiting"
Some sites may block rapid requests. Increase delay or run in smaller batches:
```bash
BACKFILL_MAX_JOBS=100 BACKFILL_DELAY_MS=5000 node scripts/backfill-descriptions-from-urls.cjs
```

## Safety

- ✅ Only updates jobs that are missing descriptions
- ✅ Validates description length (>50 chars) before saving
- ✅ Limits description length to 10,000 characters
- ✅ Processes in batches to avoid database overload
- ✅ Includes rate limiting to avoid being blocked

## Next Steps

After running the backfill:
1. Check the summary statistics
2. Verify descriptions were added:
   ```sql
   SELECT 
       source,
       COUNT(*) as total,
       COUNT(CASE WHEN description IS NOT NULL AND LENGTH(description) > 50 THEN 1 END) as with_description,
       ROUND(COUNT(CASE WHEN description IS NOT NULL AND LENGTH(description) > 50 THEN 1 END) * 100.0 / COUNT(*), 2) as percentage
   FROM jobs
   WHERE is_active = true
   GROUP BY source;
   ```
3. Run matching algorithm to see improved results

