# Jobs Table Storage Diagnosis Report

**Date:** 2025-12-28  
**Purpose:** Diagnose storage usage and identify how to reduce jobs to 8,000 active limit

## Executive Summary

- **Current State:** 8,678 total jobs (8,610 active, 68 inactive)
- **Target:** 8,000 active jobs
- **Action Required:** Delete 610 oldest active jobs
- **Storage:** 455 MB total (~54 kB per job)

## Key Findings

### 1. Current Job Counts
- **Total jobs:** 8,678
- **Active jobs** (`is_active=true` AND `status='active'`): 8,610
- **Inactive jobs:** 68
  - 51 with `status='inactive'`
  - 17 with `status='expired'`

### 2. Storage Analysis
- **Total table size:** 455 MB
- **Average size per job:** 54 kB
- **Storage breakdown:**
  - Embeddings: 4.9 MB (largest component)
  - Descriptions: 4.7 MB
  - Titles: 357 kB
  - Companies: 137 kB
  - Locations: 123 kB

### 3. Description Sizes
- **Average description:** 688 bytes
- **Max description:** 9,513 bytes (~9.3 kB)
- Descriptions are reasonably sized, not a major bloat concern

### 4. Jobs to Delete
- **Count:** 610 oldest active jobs
- **Oldest job date:** 2025-12-02 (26 days ago)
- **Newest job to delete:** 2025-12-02 16:48:08
- All jobs to be deleted are from December 2nd, 2025

### 5. Foreign Key Impact
Before deletion, we need to clean up:
- **Matches:** 1 match record references these jobs
- **Embedding Queue:** 585 queue items reference these jobs

## Deletion Strategy

### Safe Deletion Order
1. Delete `matches` records (1 row)
2. Delete `embedding_queue` records (585 rows)
3. Delete `jobs` records (610 rows)

### Verification
After deletion:
- Expected remaining: **8,000 active jobs**
- All deletions are from oldest jobs (26+ days old)
- No impact on recent jobs

## Files Created

1. **`scripts/diagnose_jobs_storage.sql`**
   - Comprehensive diagnostic queries
   - Run this to see current state

2. **`scripts/delete_oldest_jobs_to_limit.sql`**
   - Safe deletion script with transaction
   - Includes verification steps
   - Uses temp table for safety

## Recommendations

### Immediate Action
1. **Run the deletion script** (`delete_oldest_jobs_to_limit.sql`)
   - Script is wrapped in a transaction
   - Can rollback if needed
   - Includes verification steps

### Long-term Maintenance
1. **Automate cleanup:** Set up a scheduled job to delete jobs older than 30 days
2. **Monitor growth:** Track job count daily to prevent exceeding 8,000 limit
3. **Consider archiving:** Instead of deleting, archive old jobs to a separate table

### Storage Optimization
1. **Embeddings are the largest component** (4.9 MB)
   - Consider compressing or storing separately
   - Only generate embeddings for active jobs
2. **Description sizes are reasonable** (~688 bytes avg)
   - No immediate optimization needed

## Execution Instructions

### Step 1: Review Current State
```sql
-- Run diagnostic queries
\i scripts/diagnose_jobs_storage.sql
```

### Step 2: Preview Deletion
```sql
-- See what will be deleted
SELECT id, title, company, last_seen_at
FROM jobs
WHERE is_active = true AND status = 'active'
ORDER BY last_seen_at ASC NULLS FIRST
LIMIT 610;
```

### Step 3: Execute Deletion
```sql
-- Run the deletion script (wrapped in transaction)
\i scripts/delete_oldest_jobs_to_limit.sql
```

### Step 4: Verify Results
```sql
-- Should show 8,000 active jobs
SELECT COUNT(*) as active_jobs
FROM jobs
WHERE is_active = true AND status = 'active';
```

## Notes

- All jobs to be deleted are from December 2nd, 2025
- Jobs are 26+ days old (not recently seen)
- Deletion is safe - oldest jobs first
- Script uses transactions for safety
- Foreign key constraints are handled properly

