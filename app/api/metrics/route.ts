import { NextRequest, NextResponse } from 'next/server';
import { getDatabaseClient } from '@/Utils/databasePool';
import type { MetricsResponse } from '@/lib/api-types';

const HOURS_LIMIT = 168;

function parseHours(value: string | null): number {
  if (!value) return 24;
  const parsed = Number(value);
  if (!Number.isFinite(parsed) || parsed <= 0) return 24;
  return Math.min(parsed, HOURS_LIMIT);
}

export async function GET(request: NextRequest) {
  try {
    const systemKey = process.env.SYSTEM_API_KEY;
    if (!systemKey) {
      return NextResponse.json(
        { error: 'SYSTEM_API_KEY not configured' },
        { status: 500 }
      );
    }

    const providedKey = request.headers.get('x-api-key');
    if (providedKey !== systemKey) {
      return NextResponse.json(
        { error: 'Unauthorized: Invalid or missing API key' },
        { status: 401 }
      );
    }

    const hours = parseHours(request.nextUrl.searchParams.get('hours'));
    const supabase = getDatabaseClient();
    const now = new Date();
    const endIso = now.toISOString();
    const startIso = new Date(now.getTime() - hours * 60 * 60 * 1000).toISOString();

    const [
      usersResult,
      jobsResult,
      matchesResult,
      emailsResult,
    ] = await Promise.all([
      supabase
        .from('users')
        .select('id', { count: 'exact', head: true })
        .eq('subscription_active', true),
      supabase
        .from('jobs')
        .select('job_hash', { count: 'exact', head: true })
        .gte('created_at', startIso),
      supabase
        .from('matches')
        .select('id', { count: 'exact', head: true })
        .gte('created_at', startIso),
      supabase
        .from('users')
        .select('email_count')
        .not('email_count', 'is', null),
    ]);

    if (usersResult.error) throw usersResult.error;
    if (jobsResult.error) throw jobsResult.error;
    if (matchesResult.error) throw matchesResult.error;
    if (emailsResult.error) throw emailsResult.error;

    const activeUsers = usersResult.count ?? 0;
    const jobsScraped = jobsResult.count ?? 0;
    const matchesGenerated = matchesResult.count ?? 0;
    const emailsSent = (emailsResult.data || []).reduce(
      (sum, row) => sum + (row.email_count ?? 0),
      0
    );

    const response: MetricsResponse = {
      success: true,
      data: {
        current: {
          activeUsers,
          jobsScraped,
          matchesGenerated,
          emailsSent,
          errorRate: 0,
          averageResponseTime: 0,
        },
        historical: [
          {
            timestamp: startIso,
            activeUsers,
            jobsScraped,
            matchesGenerated,
            emailsSent,
            errorRate: 0,
            averageResponseTime: 0,
          },
        ],
        timeRange: {
          start: startIso,
          end: endIso,
          hours,
        },
      },
    };

    return NextResponse.json(response);
  } catch (error) {
    console.error('[metrics] Failed to generate metrics', error);
    return NextResponse.json(
      {
         error: 'Failed to generate metrics',
         details: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 }
    );
  }
}

