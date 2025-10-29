import { NextRequest, NextResponse } from 'next/server';
import { getProductionRateLimiter } from '@/Utils/productionRateLimiter';
import { HTTP_STATUS } from '@/Utils/constants';
import { getDatabaseClient } from '@/Utils/databasePool';
import { z } from 'zod';
import * as Sentry from '@sentry/nextjs';
import type { UserMatchesResponse, UserMatchesRequest } from '@/lib/api-types';
import { createSuccessResponse, createErrorResponse } from '@/lib/api-types';
import { verifyHMAC, isHMACRequired } from '@/Utils/auth/hmac';

// Input validation schema
const userMatchesQuerySchema = z.object({
  email: z.string().email('Invalid email address'),
  limit: z.coerce.number().min(1).max(50).default(10),
  minScore: z.coerce.number().min(0).max(100).default(0),
  // Add HMAC signature for authentication
  signature: z.string().min(1, 'Authentication signature required'),
  timestamp: z.coerce.number().min(1, 'Timestamp required')
});

// HMAC verification for authentication (using shared utility)
function verifyRequest(req: NextRequest, email: string, timestamp: number, signature: string): boolean {
  const hmacResult = verifyHMAC(`${email}:${timestamp}`, signature, timestamp, 5);
  return hmacResult.isValid;
}

export async function GET(req: NextRequest) {
  // PRODUCTION: Stricter rate limiting for user matches endpoint
  const rateLimitResult = await getProductionRateLimiter().middleware(req, 'user-matches', {
    windowMs: 60 * 1000, // 1 minute
    maxRequests: 5 // Reduced from 30 to 5 requests per minute
  });
  if (rateLimitResult) {
    return rateLimitResult;
  }

  try {
    const { searchParams } = new URL(req.url);
    
    // Parse and validate input
    const parseResult = userMatchesQuerySchema.safeParse({
      email: searchParams.get('email'),
      limit: searchParams.get('limit'),
      minScore: searchParams.get('minScore'),
      signature: searchParams.get('signature'),
      timestamp: searchParams.get('timestamp')
    });

    if (!parseResult.success) {
      return NextResponse.json({ 
        error: 'Invalid input parameters',
        details: parseResult.error.issues 
      }, { status: 400 });
    }

    const { email, limit, minScore, signature, timestamp } = parseResult.data;

    // Verify authentication
    if (!verifyRequest(req, email, timestamp, signature)) {
      return NextResponse.json({ 
        error: 'Authentication failed' 
      }, { status: 401 });
    }

    // Add Sentry breadcrumb for user context
    Sentry.addBreadcrumb({
      message: 'User matches request',
      level: 'info',
      data: { email, limit, minScore }
    });

    const supabase = getDatabaseClient();

    // Get user matches with job details - with timeout
    const queryPromise = supabase
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

    // Add 10 second timeout
    const timeoutPromise = new Promise((_, reject) => 
      setTimeout(() => reject(new Error('Query timeout')), 10000)
    );

    const { data: matches, error: matchesError } = await Promise.race([
      queryPromise,
      timeoutPromise
    ]) as any;

    if (matchesError) {
      console.error('Failed to fetch user matches:', matchesError);
      
      // Capture error in Sentry
      Sentry.captureException(matchesError, {
        tags: { component: 'user-matches-api' },
        extra: { email, limit, minScore }
      });
      
      return NextResponse.json({ error: 'Failed to fetch matches' }, { status: 500 });
    }

    // Transform the data to a cleaner format
    const transformedMatches = matches?.map((match: any) => ({
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
    
    // Capture error in Sentry with user context
    Sentry.captureException(error, {
      tags: { component: 'user-matches-api' },
      extra: { 
        email: new URL(req.url).searchParams.get('email'),
        limit: new URL(req.url).searchParams.get('limit'),
        minScore: new URL(req.url).searchParams.get('minScore')
      }
    });
    
    return NextResponse.json({ error: 'Server error' }, { status: HTTP_STATUS.INTERNAL_ERROR });
  }
}
