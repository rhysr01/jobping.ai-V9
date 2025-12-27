import { NextRequest, NextResponse } from 'next/server';
import { getDatabaseClient } from '@/Utils/databasePool';
import { apiLogger } from '@/lib/api-logger';
import { getProductionRateLimiter } from '@/Utils/productionRateLimiter';
import { normalizeJobLocation } from '@/lib/locationNormalizer';

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
      apiLogger.warn('Matches API: No cookie found', new Error('Unauthorized'), {});
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const supabase = getDatabaseClient();

    // Verify user exists and is free tier
    const { data: user, error: userError } = await supabase
      .from('users')
      .select('id, email, subscription_tier')
      .eq('email', email)
      .eq('subscription_tier', 'free')
      .single();

    if (userError || !user) {
      return NextResponse.json({ error: 'User not found' }, { status: 401 });
    }

    // Get user's matches from matches table (uses user_email!)
    const { data: matchesData, error: matchesError } = await supabase
      .from('matches')
      .select('match_score, match_reason, job_hash')
      .eq('user_email', email) // CRITICAL: Use user_email, not user_id!
      .order('match_score', { ascending: false })
      .limit(5);

    if (matchesError) {
      apiLogger.error('Failed to fetch matches', matchesError as Error, { email });
      throw matchesError;
    }

    if (!matchesData || matchesData.length === 0) {
      apiLogger.info('No matches found for user', { email });
      return NextResponse.json({ jobs: [] });
    }

    // Extract job_hashes and fetch jobs manually (more reliable than join)
    const jobHashes = matchesData.map((m: any) => m.job_hash).filter(Boolean);
    
    if (jobHashes.length === 0) {
      apiLogger.warn('Matches found but no job_hashes', { email, matchesCount: matchesData.length });
      return NextResponse.json({ jobs: [] });
    }

    // Fetch jobs by job_hash
    const { data: jobsData, error: jobsError } = await supabase
      .from('jobs')
      .select('id, title, company, location, city, country, description, job_url, work_environment, categories, job_hash')
      .in('job_hash', jobHashes)
      .eq('is_active', true)
      .eq('status', 'active');

    if (jobsError) {
      apiLogger.error('Failed to fetch jobs', jobsError as Error, { email, jobHashesCount: jobHashes.length });
      throw jobsError;
    }

    // Create a map of job_hash -> job for quick lookup
    const jobsMap = new Map((jobsData || []).map((job: any) => [job.job_hash, job]));

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

