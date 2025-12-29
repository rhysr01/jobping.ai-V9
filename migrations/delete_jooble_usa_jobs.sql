-- Migration: Delete USA-based jobs from Jooble source
-- These were incorrectly saved due to city name matches (e.g., "Warsaw, IN" instead of "Warsaw, Poland")
-- Created: 2025-01-XX

-- First, show what will be deleted (for verification)
SELECT 
  location,
  COUNT(*) as job_count
FROM jobs
WHERE source = 'jooble'
  AND (
    -- USA state abbreviations
    LOWER(location) LIKE '%, tx%' OR
    LOWER(location) LIKE '%, ky%' OR
    LOWER(location) LIKE '%, in%' OR
    LOWER(location) LIKE '%, va%' OR
    LOWER(location) LIKE '%, ca%' OR
    LOWER(location) LIKE '%, md%' OR
    LOWER(location) LIKE '%, mt%' OR
    LOWER(location) LIKE '%, ne%' OR
    LOWER(location) LIKE '%, nd%' OR
    LOWER(location) LIKE '%, ny%' OR
    LOWER(location) LIKE '%, fl%' OR
    LOWER(location) LIKE '%, il%' OR
    LOWER(location) LIKE '%, pa%' OR
    LOWER(location) LIKE '%, oh%' OR
    LOWER(location) LIKE '%, ga%' OR
    LOWER(location) LIKE '%, nc%' OR
    LOWER(location) LIKE '%, mi%' OR
    LOWER(location) LIKE '%, nj%' OR
    LOWER(location) LIKE '%, az%' OR
    LOWER(location) LIKE '%, wa%' OR
    LOWER(location) LIKE '%, ma%' OR
    LOWER(location) LIKE '%, tn%' OR
    LOWER(location) LIKE '%, co%' OR
    LOWER(location) LIKE '%, sc%' OR
    LOWER(location) LIKE '%, al%' OR
    LOWER(location) LIKE '%, la%' OR
    LOWER(location) LIKE '%, mo%' OR
    LOWER(location) LIKE '%, mn%' OR
    LOWER(location) LIKE '%, ct%' OR
    LOWER(location) LIKE '%, ia%' OR
    LOWER(location) LIKE '%, ar%' OR
    LOWER(location) LIKE '%, ok%' OR
    LOWER(location) LIKE '%, ut%' OR
    LOWER(location) LIKE '%, nv%' OR
    LOWER(location) LIKE '%, ms%' OR
    LOWER(location) LIKE '%, ks%' OR
    LOWER(location) LIKE '%, nm%' OR
    LOWER(location) LIKE '%, wv%' OR
    LOWER(location) LIKE '%, nh%' OR
    LOWER(location) LIKE '%, id%' OR
    LOWER(location) LIKE '%, hi%' OR
    LOWER(location) LIKE '%, me%' OR
    LOWER(location) LIKE '%, ri%' OR
    LOWER(location) LIKE '%, de%' OR
    LOWER(location) LIKE '%, sd%' OR
    LOWER(location) LIKE '%, ak%' OR
    LOWER(location) LIKE '%, vt%' OR
    LOWER(location) LIKE '%, wy%' OR
    LOWER(location) LIKE '%, dc%' OR
    -- Exact state matches at end
    location LIKE '%, TX' OR
    location LIKE '%, KY' OR
    location LIKE '%, IN' OR
    location LIKE '%, VA' OR
    location LIKE '%, CA' OR
    location LIKE '%, MD' OR
    location LIKE '%, MT' OR
    location LIKE '%, NE' OR
    location LIKE '%, ND' OR
    -- USA-specific city patterns
    LOWER(location) LIKE '%washington dc%' OR
    LOWER(location) LIKE '%washington, dc%' OR
    LOWER(location) LIKE '%united states%' OR
    LOWER(location) LIKE '%usa%' OR
    LOWER(location) LIKE '%u.s.a%' OR
    LOWER(location) LIKE '%u.s.%'
  )
GROUP BY location
ORDER BY job_count DESC;

-- Delete USA-based Jooble jobs
DELETE FROM jobs
WHERE source = 'jooble'
  AND (
    -- USA state abbreviations
    LOWER(location) LIKE '%, tx%' OR
    LOWER(location) LIKE '%, ky%' OR
    LOWER(location) LIKE '%, in%' OR
    LOWER(location) LIKE '%, va%' OR
    LOWER(location) LIKE '%, ca%' OR
    LOWER(location) LIKE '%, md%' OR
    LOWER(location) LIKE '%, mt%' OR
    LOWER(location) LIKE '%, ne%' OR
    LOWER(location) LIKE '%, nd%' OR
    LOWER(location) LIKE '%, ny%' OR
    LOWER(location) LIKE '%, fl%' OR
    LOWER(location) LIKE '%, il%' OR
    LOWER(location) LIKE '%, pa%' OR
    LOWER(location) LIKE '%, oh%' OR
    LOWER(location) LIKE '%, ga%' OR
    LOWER(location) LIKE '%, nc%' OR
    LOWER(location) LIKE '%, mi%' OR
    LOWER(location) LIKE '%, nj%' OR
    LOWER(location) LIKE '%, az%' OR
    LOWER(location) LIKE '%, wa%' OR
    LOWER(location) LIKE '%, ma%' OR
    LOWER(location) LIKE '%, tn%' OR
    LOWER(location) LIKE '%, co%' OR
    LOWER(location) LIKE '%, sc%' OR
    LOWER(location) LIKE '%, al%' OR
    LOWER(location) LIKE '%, la%' OR
    LOWER(location) LIKE '%, mo%' OR
    LOWER(location) LIKE '%, mn%' OR
    LOWER(location) LIKE '%, ct%' OR
    LOWER(location) LIKE '%, ia%' OR
    LOWER(location) LIKE '%, ar%' OR
    LOWER(location) LIKE '%, ok%' OR
    LOWER(location) LIKE '%, ut%' OR
    LOWER(location) LIKE '%, nv%' OR
    LOWER(location) LIKE '%, ms%' OR
    LOWER(location) LIKE '%, ks%' OR
    LOWER(location) LIKE '%, nm%' OR
    LOWER(location) LIKE '%, wv%' OR
    LOWER(location) LIKE '%, nh%' OR
    LOWER(location) LIKE '%, id%' OR
    LOWER(location) LIKE '%, hi%' OR
    LOWER(location) LIKE '%, me%' OR
    LOWER(location) LIKE '%, ri%' OR
    LOWER(location) LIKE '%, de%' OR
    LOWER(location) LIKE '%, sd%' OR
    LOWER(location) LIKE '%, ak%' OR
    LOWER(location) LIKE '%, vt%' OR
    LOWER(location) LIKE '%, wy%' OR
    LOWER(location) LIKE '%, dc%' OR
    -- Exact state matches at end
    location LIKE '%, TX' OR
    location LIKE '%, KY' OR
    location LIKE '%, IN' OR
    location LIKE '%, VA' OR
    location LIKE '%, CA' OR
    location LIKE '%, MD' OR
    location LIKE '%, MT' OR
    location LIKE '%, NE' OR
    location LIKE '%, ND' OR
    -- USA-specific city patterns
    LOWER(location) LIKE '%washington dc%' OR
    LOWER(location) LIKE '%washington, dc%' OR
    LOWER(location) LIKE '%united states%' OR
    LOWER(location) LIKE '%usa%' OR
    LOWER(location) LIKE '%u.s.a%' OR
    LOWER(location) LIKE '%u.s.%'
  );

