import { NextRequest, NextResponse } from 'next/server';
import { getDatabaseClient } from '@/Utils/databasePool';
import { apiLogger } from '@/lib/api-logger';
import { getProductionRateLimiter } from '@/Utils/productionRateLimiter';
import { normalizeJobLocation } from '@/lib/locationNormalizer';

/**
 * Wrapper for database queries with timeout protection
 * Prevents infinite hanging if database is slow or unresponsive
 */
async function queryWithTimeout<T>(
  queryBuilder: any, // Supabase PostgrestBuilder (awaitable but not typed as Promise)
  timeoutMs: number = 10000,
  operation: string
): Promise<{ data: T | null; error: any }> {
  const timeoutPromise = new Promise<never>((_, reject) =>
    setTimeout(() => reject(new Error(`Query timeout after ${timeoutMs}ms`)), timeoutMs)
  );
  
  try {
    // Supabase builders are awaitable, so we can race them directly
    const result = await Promise.race([queryBuilder, timeoutPromise]);
    return result;
  } catch (error) {
    if (error instanceof Error && error.message.includes('timeout')) {
      apiLogger.error(`Database query timeout: ${operation}`, error as Error, { timeoutMs, operation });
      return { 
        data: null, 
        error: { 
          message: `Database query timed out after ${timeoutMs}ms`, 
          code: 'TIMEOUT',
          operation 
        } 
      };
    }
    throw error;
  }
}

export async function GET(request: NextRequest) {
  // Rate limiting - prevent abuse
  const rateLimitResult = await getProductionRateLimiter().middleware(request, 'matches-free', {
    windowMs: 60 * 1000, // 1 minute
    maxRequests: 10, // 10 requests per minute per IP
  });
  
  if (rateLimitResult) {
    return rateLimitResult;
  }

  try {
    // Get user email from cookie (simple approach)
    const email = request.cookies.get('free_user_email')?.value?.toLowerCase().trim();

    if (!email) {
      // Log all cookies for debugging
      const allCookies = request.cookies.getAll();
      apiLogger.warn('Matches API: No cookie found', new Error('Unauthorized'), { 
        cookieCount: allCookies.length,
        cookieNames: allCookies.map(c => c.name),
        hasFreeUserEmailCookie: !!request.cookies.get('free_user_email')
      });
      return NextResponse.json({ 
        error: 'Unauthorized',
        message: 'Please sign up again to see your matches.'
      }, { status: 401 });
    }

    const supabase = getDatabaseClient();

    // Verify user exists and is free tier (with timeout)
    const userQuery = supabase
      .from('users')
      .select('id, email, subscription_tier')
      .eq('email', email)
      .eq('subscription_tier', 'free')
      .single();

    const userResult = await queryWithTimeout(
      userQuery,
      10000, // 10 second timeout
      'fetch_user'
    );

    if (userResult.error) {
      if (userResult.error.code === 'TIMEOUT') {
        apiLogger.error('User query timeout', new Error(userResult.error.message), { email });
        return NextResponse.json(
          { error: 'Request timed out. Please try again.' },
          { status: 504 }
        );
      }
      return NextResponse.json({ error: 'User not found' }, { status: 401 });
    }

    const user = userResult.data;
    if (!user) {
      return NextResponse.json({ error: 'User not found' }, { status: 401 });
    }

    // Get user's matches from matches table (uses user_email!) (with timeout)
    const matchesQuery = supabase
      .from('matches')
      .select('match_score, match_reason, job_hash')
      .eq('user_email', email) // CRITICAL: Use user_email, not user_id!
      .order('match_score', { ascending: false })
      .limit(5);

    const matchesResult = await queryWithTimeout(
      matchesQuery,
      10000, // 10 second timeout
      'fetch_matches'
    );

    if (matchesResult.error) {
      if (matchesResult.error.code === 'TIMEOUT') {
        apiLogger.error('Matches query timeout', new Error(matchesResult.error.message), { email });
        return NextResponse.json(
          { error: 'Request timed out. Please try again.' },
          { status: 504 }
        );
      }
      apiLogger.error('Failed to fetch matches', matchesResult.error as Error, { email });
      throw matchesResult.error;
    }

    const matchesData = matchesResult.data;

    if (!matchesData || !Array.isArray(matchesData) || matchesData.length === 0) {
      apiLogger.info('No matches found for user', { 
        email,
        matchesDataType: typeof matchesData,
        isArray: Array.isArray(matchesData),
        matchesDataLength: Array.isArray(matchesData) ? matchesData.length : 0
      });
      return NextResponse.json({ jobs: [] });
    }

    // Log matches found for debugging
    apiLogger.info('Matches found for user', {
      email,
      matchesCount: matchesData.length,
      matchJobHashes: matchesData.map((m: any) => m.job_hash).slice(0, 5)
    });

    // Extract job_hashes and fetch jobs manually (more reliable than join)
    const jobHashes = matchesData.map((m: any) => m.job_hash).filter(Boolean);
    
    if (jobHashes.length === 0) {
      apiLogger.warn('Matches found but no job_hashes', { email, matchesCount: matchesData.length });
      return NextResponse.json({ jobs: [] });
    }

    // Fetch jobs by job_hash (with timeout)
    // First try with active filter
    let jobsQuery = supabase
      .from('jobs')
      .select('id, title, company, location, city, country, description, job_url, work_environment, categories, job_hash, is_active, status')
      .in('job_hash', jobHashes)
      .eq('is_active', true)
      .eq('status', 'active');

    let jobsResult = await queryWithTimeout(
      jobsQuery,
      10000, // 10 second timeout
      'fetch_jobs_active'
    );

    if (jobsResult.error) {
      if (jobsResult.error.code === 'TIMEOUT') {
        apiLogger.error('Jobs query timeout', new Error(jobsResult.error.message), { email, jobHashesCount: jobHashes.length });
        return NextResponse.json(
          { error: 'Request timed out. Please try again.' },
          { status: 504 }
        );
      }
      apiLogger.error('Failed to fetch jobs', jobsResult.error as Error, { email, jobHashesCount: jobHashes.length });
      throw jobsResult.error;
    }

    let jobsData = jobsResult.data;
    let jobsArray = Array.isArray(jobsData) ? jobsData : [];

    // FALLBACK: If no active jobs found, try without active filter
    // This handles the case where jobs were matched but later deactivated
    if (jobsArray.length === 0 && jobHashes.length > 0) {
      apiLogger.warn('No active jobs found for matches, trying fallback (include inactive)', {
        email,
        jobHashesRequested: jobHashes.length,
        jobHashes: jobHashes.slice(0, 3)
      });

      const fallbackQuery = supabase
        .from('jobs')
        .select('id, title, company, location, city, country, description, job_url, work_environment, categories, job_hash, is_active, status')
        .in('job_hash', jobHashes);

      const fallbackResult = await queryWithTimeout(
        fallbackQuery,
        10000,
        'fetch_jobs_fallback'
      );

      if (!fallbackResult.error && fallbackResult.data) {
        jobsArray = Array.isArray(fallbackResult.data) ? fallbackResult.data : [];
        apiLogger.info('Fallback query found jobs', {
          email,
          jobsFound: jobsArray.length,
          activeJobs: jobsArray.filter(j => j.is_active && j.status === 'active').length,
          inactiveJobs: jobsArray.filter(j => !j.is_active || j.status !== 'active').length
        });
      }
    }

    // Create a map of job_hash -> job for quick lookup
    const jobsMap = new Map(jobsArray.map((job: any) => [job.job_hash, job]));

    // Log missing jobs for debugging
    const missingHashes = jobHashes.filter(hash => !jobsMap.has(hash));
    if (missingHashes.length > 0) {
      apiLogger.warn('Jobs not found for matches', { 
        email,
        missingCount: missingHashes.length,
        missingHashes: missingHashes.slice(0, 5),
        totalMatches: matchesData.length,
        jobsFound: jobsArray.length,
        reason: 'Jobs may have been deleted from database'
      });
    }

    // Log active vs inactive jobs
    const activeJobs = jobsArray.filter(j => j.is_active && j.status === 'active');
    const inactiveJobs = jobsArray.filter(j => !j.is_active || j.status !== 'active');
    if (inactiveJobs.length > 0) {
      apiLogger.info('Some matched jobs are inactive', {
        email,
        activeCount: activeJobs.length,
        inactiveCount: inactiveJobs.length,
        inactiveJobHashes: inactiveJobs.map(j => j.job_hash).slice(0, 3)
      });
    }

    // Format response with normalized location data
    const jobs = matchesData
      .map((m: any) => {
        const job = jobsMap.get(m.job_hash);
        if (!job) {
          apiLogger.warn('Match has job_hash but job not found', { 
            email, 
            job_hash: m.job_hash,
            availableJobHashes: Array.from(jobsMap.keys()).slice(0, 3)
          });
          return null;
        }
        
        // Normalize location data for consistent display
        const normalized = normalizeJobLocation({
          city: job.city,
          country: job.country,
          location: job.location,
        });
        
        return {
          id: job.id,
          title: job.title,
          company: job.company,
          location: normalized.location, // Use normalized location
          city: normalized.city, // Use normalized city
          country: normalized.country, // Use normalized country
          description: job.description,
          url: job.job_url, // Use job_url, not url
          work_environment: job.work_environment,
          match_score: m.match_score,
          match_reason: m.match_reason,
        };
      })
      .filter(Boolean); // Remove null entries

    apiLogger.info('Matches fetched successfully', { 
      email, 
      matchesCount: matchesData.length,
      jobsFound: jobs.length,
      jobsRequested: jobHashes.length
    });

    return NextResponse.json({ jobs });

  } catch (error) {
    apiLogger.error('Matches API failed', error as Error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

