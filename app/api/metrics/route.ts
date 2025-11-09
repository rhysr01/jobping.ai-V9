import type { NextRequest } from 'next/server';
import { metricsCollector } from '../../../Utils/monitoring/metricsCollector';
import type { HistoricalMetrics } from '@/lib/types';

const jsonResponse = (body: unknown, init?: ResponseInit) =>
  new Response(JSON.stringify(body), {
    headers: { 'content-type': 'application/json' },
    ...init,
  });

const getMetricsHandler = async (request: NextRequest) => {
  const startTime = Date.now();
  
  try {
    console.log(' Collecting metrics...');
    
    // Get query parameters
    const { searchParams } = new URL(request.url);
    const hours = parseInt(searchParams.get('hours') || '1');
    
    // Validate hours parameter
    if (hours < 1 || hours > 168) { // Max 1 week
      return jsonResponse({
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

    return jsonResponse(response);

  } catch (error) {
    console.error(' Metrics collection error:', error);
    return jsonResponse({
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
  return new Response(null, { status: 200 });
}
