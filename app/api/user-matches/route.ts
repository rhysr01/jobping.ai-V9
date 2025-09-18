import { NextRequest, NextResponse } from 'next/server';
import { getProductionRateLimiter } from '@/Utils/productionRateLimiter';
import { HTTP_STATUS } from '@/Utils/constants';
import { getSupabaseClient } from '@/Utils/supabase';

export async function GET(req: NextRequest) {
  // PRODUCTION: Rate limiting for user matches endpoint
  const rateLimitResult = await getProductionRateLimiter().middleware(req, 'default', {
    windowMs: 60 * 1000, // 1 minute
    maxRequests: 30 // 30 requests per minute for user queries
  });
  if (rateLimitResult) {
    return rateLimitResult;
  }

  try {
    const { searchParams } = new URL(req.url);
    const email = searchParams.get('email');
    const limit = parseInt(searchParams.get('limit') || '10');
    const minScore = parseFloat(searchParams.get('minScore') || '0');

    if (!email) {
      return NextResponse.json({ error: 'Email parameter is required' }, { status: 400 });
    }

    const supabase = getSupabaseClient();

    // Get user matches with job details
    const { data: matches, error: matchesError } = await supabase
      .from('matches')
      .select(`
        *,
        jobs (
          id,
          title,
          company,
          location,
          job_url,
          description,
          categories,
          experience_required,
          work_environment,
          language_requirements,
          company_profile_url,
          posted_at
        )
      `)
      .eq('user_email', email)
      .gte('match_score', minScore)
      .order('match_score', { ascending: false })
      .limit(limit);

    if (matchesError) {
      console.error('Failed to fetch user matches:', matchesError);
      return NextResponse.json({ error: 'Failed to fetch matches' }, { status: 500 });
    }

    // Transform the data to a cleaner format
    const transformedMatches = matches?.map(match => ({
      id: match.id,
      match_score: match.match_score,
      match_reason: match.match_reason,
      match_quality: match.match_quality,
      match_tags: match.match_tags,
      matched_at: match.matched_at,
      job: match.jobs
    })) || [];

    return NextResponse.json({
      user_email: email,
      total_matches: transformedMatches.length,
      matches: transformedMatches
    });

  } catch (error) {
    console.error('User matches API error:', error);
    return NextResponse.json({ error: 'Server error' }, { status: HTTP_STATUS.INTERNAL_ERROR });
  }
}
