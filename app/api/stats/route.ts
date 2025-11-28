// Public stats API for landing page
// Returns active job count and other public metrics

import { NextRequest, NextResponse } from 'next/server';
import { getDatabaseClient } from '@/Utils/databasePool';
import { createSuccessResponse } from '@/lib/api-types';
import { asyncHandler, AppError } from '@/lib/errors';

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

// Cache stats for 1 hour
let cachedStats: any = null;
let lastFetch: number = 0;
const CACHE_DURATION = 60 * 60 * 1000; // 1 hour

export const dynamic = 'force-dynamic';
export const revalidate = 3600; // 1 hour

export const GET = asyncHandler(async (req: NextRequest) => {
  const requestId = getRequestId(req);
  const now = Date.now();
  
  // Return cached stats if still valid
  if (cachedStats && now - lastFetch < CACHE_DURATION) {
    const successResponse = createSuccessResponse(
      {
        ...cachedStats,
        cached: true,
        cacheAge: Math.floor((now - lastFetch) / 1000 / 60), // minutes
      },
      undefined,
      requestId
    );
    const response = NextResponse.json(successResponse, { status: 200 });
    response.headers.set('x-request-id', requestId);
    return response;
  }

  // Fetch fresh stats
  const supabase = getDatabaseClient();
  
  // Get active job count
  const { count: activeJobs, error: jobsError } = await supabase
    .from('jobs')
    .select('*', { count: 'exact', head: true })
    .eq('is_active', true);

  if (jobsError) {
    throw new AppError('Failed to fetch job stats', 500, 'DATABASE_ERROR', jobsError);
  }

  // Get internship count
  const { count: internships } = await supabase
    .from('jobs')
    .select('*', { count: 'exact', head: true })
    .eq('is_active', true)
    .eq('is_internship', true);

  // Get graduate program count
  const { count: graduates } = await supabase
    .from('jobs')
    .select('*', { count: 'exact', head: true })
    .eq('is_active', true)
    .eq('is_graduate', true);

  // Get user count for social proof
  const { count: totalUsers } = await supabase
    .from('users')
    .select('*', { count: 'exact', head: true })
    .eq('active', true)
    .eq('email_verified', true);

  // Format numbers with commas
  const formatNumber = (num: number) => {
    return num.toLocaleString('en-US');
  };

  cachedStats = {
    activeJobs: activeJobs || 0,
    activeJobsFormatted: formatNumber(activeJobs || 0),
    internships: internships || 0,
    graduates: graduates || 0,
    totalUsers: totalUsers || 0,
    totalUsersFormatted: formatNumber(totalUsers || 0),
    lastUpdated: new Date().toISOString(),
  };

  lastFetch = now;

  const successResponse = createSuccessResponse(
    {
      ...cachedStats,
      cached: false,
    },
    undefined,
    requestId
  );
  
  const response = NextResponse.json(successResponse, { status: 200 });
  response.headers.set('x-request-id', requestId);
  return response;
});

