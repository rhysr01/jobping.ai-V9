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

    // Get user's matches from YOUR matches table (uses user_email!)
    const { data: matchesData, error: matchesError } = await supabase
      .from('matches')
      .select(`
        match_score,
        match_reason,
        jobs (
          id,
          title,
          company,
          location,
          city,
          country,
          description,
          job_url,
          work_environment,
          categories
        )
      `)
      .eq('user_email', email) // CRITICAL: Use user_email, not user_id!
      .order('match_score', { ascending: false })
      .limit(5);

    if (matchesError) {
      apiLogger.error('Failed to fetch matches', matchesError as Error, { email });
      throw matchesError;
    }

    // Format response with normalized location data
    const jobs = (matchesData || [])
      .filter((m: any) => m.jobs && !Array.isArray(m.jobs)) // Filter out any null jobs and ensure it's an object
      .map((m: any) => {
        const job = Array.isArray(m.jobs) ? m.jobs[0] : m.jobs;
        
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

