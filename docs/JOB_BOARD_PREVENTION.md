# Job Board Prevention System

## Overview
Comprehensive system to prevent job boards/aggregators from being saved as company names in the database.

## Problem
Job boards (aggregators like Indeed, Reed, LinkedIn, Adzuna) were being saved as company names instead of the actual employer. This creates data quality issues and poor user experience.

## Solution

### 1. Code-Level Prevention

#### Processor (`scrapers/shared/processor.cjs`)
- Filters out job boards during job processing
- Returns `null` for jobs from job boards
- Prevents them from being saved to database

#### Validator (`scrapers/shared/jobValidator.cjs`)
- Second layer of validation
- Flags job boards as invalid before database save
- Provides error messages for debugging

### 2. Database-Level Prevention

#### Migration: `20251229174525_fix_all_data_quality_issues.sql`
- Flags existing job board companies
- Sets `filtered_reason = 'job_board_as_company'`
- Sets `is_active = false`

#### Migration: `20260102181647_filter_efinancial_job_board.sql`
- Specifically handles efinancial careers job board

#### Migration: `20260102182300_fix_remaining_job_boards.sql`
- Fixes remaining job boards (Indeed, Reed, StepStone, Google)

## Job Boards List

The following job boards are filtered:

### Major Job Boards
- **reed** / reed.co.uk
- **indeed** / indeed.com
- **linkedin** / linkedin.com
- **adzuna** / adzuna.co.uk
- **totaljobs** / totaljobs.com
- **monster** / monster.com
- **ziprecruiter** / ziprecruiter.com
- **jobspy**
- **google** (Google Jobs)
- **glassdoor** / glassdoor.com
- **careerjet** / careerjet.com
- **jooble**
- **arbeitnow**
- **efinancial** / efinancialcareers
- **stepstone** / stepstone.com

### Detection Logic

```javascript
const isJobBoard = jobBoards.some(
  (board) =>
    company.toLowerCase().includes(board) ||
    rawCompany.toLowerCase().includes(board),
);
```

## Important Distinction

### ❌ Job Boards (Filtered)
Job boards are **aggregators** that collect jobs from multiple sources:
- Indeed
- Reed
- LinkedIn Jobs
- Adzuna
- Totaljobs
- etc.

### ✅ Recruitment Agencies (NOT Filtered)
Recruitment agencies are **legitimate companies** that help place candidates:
- Hays Recruitment
- Veritas Education Recruitment
- Blackwater Recruitment
- etc.

**Why?** Recruitment agencies are actual employers - they hire people to work at their clients' companies or at the agency itself. They should NOT be filtered.

## Prevention Checklist

- [x] Processor filters job boards
- [x] Validator validates job boards
- [x] Migration flags existing job boards
- [x] Comprehensive job board list maintained
- [x] Distinction between job boards and recruitment agencies
- [x] Regular monitoring for new job boards

## Monitoring

Run this query periodically to check for new job board companies:

```sql
SELECT 
  company,
  company_name,
  COUNT(*) as job_count,
  COUNT(CASE WHEN is_active = true THEN 1 END) as active_count
FROM jobs
WHERE (
  company ILIKE '%reed%' OR
  company ILIKE '%indeed%' OR
  company ILIKE '%linkedin%' OR
  company ILIKE '%adzuna%' OR
  company ILIKE '%totaljobs%' OR
  company ILIKE '%monster%' OR
  company ILIKE '%ziprecruiter%' OR
  company ILIKE '%jobspy%' OR
  company ILIKE '%glassdoor%' OR
  company ILIKE '%careerjet%' OR
  company ILIKE '%jooble%' OR
  company ILIKE '%arbeitnow%' OR
  company ILIKE '%efinancial%' OR
  company ILIKE '%stepstone%'
)
AND company NOT ILIKE '%recruitment%'  -- Exclude recruitment agencies
AND company NOT ILIKE '%staffing%'
AND company NOT ILIKE '%placement%'
AND (filtered_reason IS NULL OR filtered_reason NOT LIKE '%job_board_as_company%')
GROUP BY company, company_name
ORDER BY job_count DESC;
```

## Adding New Job Boards

When a new job board is discovered:

1. **Add to processor.cjs** - Add to `jobBoards` array
2. **Add to jobValidator.cjs** - Add to `JOB_BOARDS` array
3. **Create migration** - Flag existing jobs from this job board
4. **Update this document** - Add to the job boards list

## Testing

To test the prevention system:

1. Create a test job with company = "Indeed"
2. Run through processor - should return `null`
3. Run through validator - should return `valid: false`
4. Verify job is not saved to database

## Related Files

- `scrapers/shared/processor.cjs` - Main filtering logic
- `scrapers/shared/jobValidator.cjs` - Validation logic
- `supabase/migrations/20251229174525_fix_all_data_quality_issues.sql` - Initial fix
- `supabase/migrations/20260102181647_filter_efinancial_job_board.sql` - efinancial fix
- `supabase/migrations/20260102182300_fix_remaining_job_boards.sql` - Remaining fixes

