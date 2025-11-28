import { NextRequest, NextResponse } from 'next/server';
import { getProductionRateLimiter } from '@/Utils/productionRateLimiter';
import { getDatabaseClient } from '@/Utils/databasePool';
import { z } from 'zod';
import { captureException, addBreadcrumb } from '@/lib/sentry-utils';
import { createSuccessResponse, createErrorResponse } from '@/lib/api-types';
import { verifyHMAC } from '@/Utils/auth/hmac';
import { asyncHandler, AppError } from '@/lib/errors';

// Input validation schema
const userMatchesQuerySchema = z.object({
  email: z.string().email('Invalid email address'),
  limit: z.coerce.number().min(1).max(50).default(10),
  minScore: z.coerce.number().min(0).max(100).default(0),
  // Add HMAC signature for authentication
  signature: z.string().min(1, 'Authentication signature required'),
  timestamp: z.coerce.number().min(1, 'Timestamp required')
});

// HMAC verification now handled by shared utility

// Helper to get requestId from request
function getRequestId(req: NextRequest): string {
  const headerVal = req.headers.get('x-request-id');
  if (headerVal && headerVal.length > 0) {
    return headerVal;
  }
  try {
    // eslint-disable-next-line
    const nodeCrypto = require('crypto');
    return nodeCrypto.randomUUID ? nodeCrypto.randomUUID() : nodeCrypto.randomBytes(16).toString('hex');
  } catch {
    return Math.random().toString(36).slice(2) + Date.now().toString(36);
  }
}

export const GET = asyncHandler(async (req: NextRequest) => {
  // PRODUCTION: Stricter rate limiting for user matches endpoint
  const rateLimitResult = await getProductionRateLimiter().middleware(req, 'user-matches', {
    windowMs: 60 * 1000, // 1 minute
    maxRequests: 5 // Reduced from 30 to 5 requests per minute
  });
  if (rateLimitResult) {
    return rateLimitResult;
  }

  const requestId = getRequestId(req);
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
    const errorResponse = createErrorResponse(
      'Invalid input parameters',
      'VALIDATION_ERROR',
      parseResult.error.issues,
      undefined,
      requestId
    );
    const response = NextResponse.json(errorResponse, { status: 400 });
    response.headers.set('x-request-id', requestId);
    return response;
  }

  const { email, limit, minScore, signature, timestamp } = parseResult.data;

  // Verify authentication (mandatory in prod, optional in dev/test)
  const hmacResult = verifyHMAC(`${email}:${timestamp}`, signature, timestamp, 5);
  if (!hmacResult.isValid) {
    const errorResponse = createErrorResponse(
      'Authentication failed',
      'UNAUTHORIZED',
      hmacResult.error,
      undefined,
      requestId
    );
    const response = NextResponse.json(errorResponse, { status: 401 });
    response.headers.set('x-request-id', requestId);
    return response;
  }

  // Add Sentry breadcrumb for user context
  addBreadcrumb({
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
    captureException(matchesError, {
      tags: { component: 'user-matches-api' },
      extra: { email, limit, minScore }
    });
    
    throw new AppError('Failed to fetch matches', 500, 'DATABASE_ERROR', matchesError);
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

  const successResponse = createSuccessResponse(
    {
      user_email: email,
      total_matches: transformedMatches.length,
      matches: transformedMatches
    },
    undefined,
    requestId
  );
  
  const response = NextResponse.json(successResponse, { status: 200 });
  response.headers.set('x-request-id', requestId);
  return response;
});
