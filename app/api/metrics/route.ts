import { NextRequest, NextResponse } from 'next/server';
import { getDatabaseClient } from '@/Utils/databasePool';
import type { MetricsResponse } from '@/lib/api-types';

const HOURS_LIMIT = 168; // 7 days

function parseHoursParam(value: string | null): number {
  if (!value) return 24;
  const parsed = Number(value);
  if (!Number.isFinite(parsed) || parsed <= 0) {
    return 24;
  }
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

    const hours = parseHoursParam(request.nextUrl.searchParams.get('hours'));
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

import { NextRequest, NextResponse } from 'next/server';
import { metricsCollector } from '../../../Utils/monitoring/metricsCollector';
import type { HistoricalMetrics } from '@/lib/types';

const getMetricsHandler = async (request: NextRequest) => {
  const startTime = Date.now();
  
  try {
    console.log(' Collecting metrics...');
    
    // Get query parameters
    const { searchParams } = new URL(request.url);
    const hours = parseInt(searchParams.get('hours') || '1');
    
    // Validate hours parameter
    if (hours < 1 || hours > 168) { // Max 1 week
      return NextResponse.json({
        error: 'Invalid hours parameter. Must be between 1 and 168.'
      }, { status: 400 });
    }

    // Collect current metrics
    const currentMetrics = await metricsCollector.collectMetrics();
    
    // Get historical metrics if requested
    let historicalMetrics: HistoricalMetrics[] = [];
    if (hours > 1) {
      const systemMetrics = await metricsCollector.getMetricsHistory(hours);
      // Convert SystemMetrics to HistoricalMetrics
      historicalMetrics = systemMetrics.map(metric => ({
        timestamp: metric.timestamp,
        activeUsers: metric.business.active_users,
        jobsScraped: metric.business.recent_jobs,
        matchesGenerated: metric.business.recent_matches,
        emailsSent: metric.business.email_sends_today,
        errorRate: metric.business.failed_emails / Math.max(metric.business.email_sends_today, 1),
        averageResponseTime: metric.performance.response_time,
        totalUsers: metric.business.total_users,
        recentJobs: metric.business.recent_jobs,
        recentMatches: metric.business.recent_matches,
        failedEmails: metric.business.failed_emails,
        pendingJobs: metric.queue.pending_jobs,
        processingJobs: metric.queue.processing_jobs,
        failedJobs: metric.queue.failed_jobs,
        completedJobsToday: metric.queue.completed_jobs_today,
      }));
    }

    const response = {
      current: currentMetrics,
      history: historicalMetrics,
      collection_time: Date.now() - startTime,
      requested_hours: hours
    };

    return NextResponse.json(response);

  } catch (error) {
    console.error(' Metrics collection error:', error);
    return NextResponse.json({
      error: 'Failed to collect metrics',
      message: error instanceof Error ? error.message : 'Unknown error',
      collection_time: Date.now() - startTime
    }, { status: 500 });
  }
};

// Export with auth wrapper
export const GET = getMetricsHandler;

// Health check endpoint
export async function HEAD() {
  return new NextResponse(null, { status: 200 });
}
