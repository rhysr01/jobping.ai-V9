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
    const email = request.cookies.get('free_user_email')?.value;

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
      apiLogger.info('No matches found for user', { email });
      return NextResponse.json({ jobs: [] });
    }

    // Extract job_hashes and fetch jobs manually (more reliable than join)
    const jobHashes = matchesData.map((m: any) => m.job_hash).filter(Boolean);
    
    if (jobHashes.length === 0) {
      apiLogger.warn('Matches found but no job_hashes', { email, matchesCount: matchesData.length });
      return NextResponse.json({ jobs: [] });
    }

    // Fetch jobs by job_hash (with timeout)
    const jobsQuery = supabase
      .from('jobs')
      .select('id, title, company, location, city, country, description, job_url, work_environment, categories, job_hash')
      .in('job_hash', jobHashes)
      .eq('is_active', true)
      .eq('status', 'active');
    
    const jobsResult = await queryWithTimeout(
      jobsQuery,
      10000, // 10 second timeout
      'fetch_jobs'
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

    const jobsData = jobsResult.data;

    // Create a map of job_hash -> job for quick lookup
    const jobsArray = Array.isArray(jobsData) ? jobsData : [];
    const jobsMap = new Map(jobsArray.map((job: any) => [job.job_hash, job]));

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

