import { NextRequest, NextResponse } from 'next/server';
import { getProductionRateLimiter } from '@/Utils/productionRateLimiter';
import { getSupabaseClient } from '@/Utils/supabase';
import { asyncHandler } from '@/lib/errors';
import { performanceMonitor } from '@/lib/monitoring';

// Helper function to get database metrics
async function getDatabaseMetrics(): Promise<Record<string, any>> {
  try {
    const supabase = getSupabaseClient();
    
    // Get counts for key tables
    const [usersResult, jobsResult, matchesResult] = await Promise.allSettled([
      supabase.from('users').select('*', { count: 'exact', head: true }),
      supabase.from('jobs').select('*', { count: 'exact', head: true }),
      supabase.from('matches').select('*', { count: 'exact', head: true })
    ]);
    
    return {
      users: usersResult.status === 'fulfilled' ? usersResult.value.count : 0,
      jobs: jobsResult.status === 'fulfilled' ? jobsResult.value.count : 0,
      matches: matchesResult.status === 'fulfilled' ? matchesResult.value.count : 0,
      timestamp: new Date().toISOString()
    };
  } catch (error) {
    console.error('Database metrics error:', error);
    return { error: 'Failed to fetch database metrics' };
  }
}

// Helper function to get scraper metrics
function getScraperMetrics() {
  // const config = getScraperConfig();
  
  return {
    enabledPlatforms: ['jobspy', 'adzuna', 'reed', 'greenhouse'],
    
    disabledPlatforms: [],
    
    features: {
      debugMode: false,
      telemetry: true,
      rateLimiting: true,
      browserPool: false
    },
    
    settings: {
      batchSize: 150,
      maxRetries: 3,
      requestsPerMinute: 60,
      requestsPerHour: 1000
    }
  };
}

// Helper function to get performance metrics
function getDetailedPerformanceMetrics() {
  const summaryStats = performanceMonitor.getMetricStats('api.latency');
  const percentiles = performanceMonitor.getPercentiles('api.latency', [50, 95, 99]);
  const histogram = performanceMonitor.getHistogram('api.latency', [50, 100, 250, 500, 1000, 2500, 5000]);
  const perOperation = performanceMonitor.getMetricsByPrefix('api.latency:');

  const operations = Object.entries(perOperation).map(([key, stats]) => ({
    operation: key.replace('api.latency:', ''),
    count: stats.count,
    average: stats.avg,
    min: stats.min,
    max: stats.max
  }));

  const operationsByVolume = [...operations].sort((a, b) => b.count - a.count).slice(0, 10);
  const slowestOperations = [...operations]
    .sort((a, b) => b.average - a.average)
    .slice(0, 5);

  return {
    summary: summaryStats
      ? {
          samples: summaryStats.count,
          averageLatency: Math.round(summaryStats.avg),
          minLatency: summaryStats.min,
          maxLatency: summaryStats.max,
          p50Latency: percentiles ? Math.round(percentiles.p50 ?? summaryStats.avg) : null,
          p95Latency: percentiles ? Math.round(percentiles.p95 ?? summaryStats.avg) : null,
          p99Latency: percentiles ? Math.round(percentiles.p99 ?? summaryStats.max) : null,
        }
      : {
          message: 'No API latency samples recorded yet.',
        },
    histogram,
    operations: operationsByVolume,
    slowestOperations,
  };
}

// Helper function to get system metrics
function getSystemMetrics() {
  const usage = process.memoryUsage();
  
  return {
    memory: {
      rss: Math.round(usage.rss / 1024 / 1024), // MB
      heapTotal: Math.round(usage.heapTotal / 1024 / 1024), // MB
      heapUsed: Math.round(usage.heapUsed / 1024 / 1024), // MB
      external: Math.round(usage.external / 1024 / 1024), // MB
      arrayBuffers: Math.round(usage.arrayBuffers / 1024 / 1024) // MB
    },
    uptime: Math.round(process.uptime()), // seconds
    nodeVersion: process.version,
    platform: process.platform,
    arch: process.arch
  };
}

// Helper function to get environment status
function getEnvironmentStatus() {
  return {
    nodeEnv: process.env.NODE_ENV || 'development',
    hasRequiredEnvVars: {
      supabaseUrl: !!process.env.NEXT_PUBLIC_SUPABASE_URL,
      supabaseKey: !!process.env.SUPABASE_SERVICE_ROLE_KEY,
      openaiKey: !!process.env.OPENAI_API_KEY,
      redisUrl: !!process.env.REDIS_URL,
      scrapeApiKey: !!process.env.SCRAPE_API_KEY
    },
    optionalEnvVars: {
      datadogHost: !!process.env.DD_AGENT_HOST,
      datadogPort: !!process.env.DD_AGENT_PORT,
      debugMode: process.env.SCRAPER_DEBUG_MODE === 'true',
      enableTelemetry: process.env.ENABLE_SCRAPER_TELEMETRY !== 'false'
    }
  };
}

export const GET = asyncHandler(async (req: NextRequest) => {
  // PRODUCTION: Rate limiting for dashboard endpoint
  const rateLimitResult = await getProductionRateLimiter().middleware(req, 'dashboard', {
    windowMs: 60 * 1000, // 1 minute
    maxRequests: 30 // 30 requests per minute for dashboard
  });
  if (rateLimitResult) {
    return rateLimitResult;
  }

  const startTime = Date.now();
  
  // Gather all metrics in parallel
  const [databaseMetrics, scraperMetrics, performanceMetrics, systemMetrics, envStatus] = await Promise.allSettled([
    getDatabaseMetrics(),
    Promise.resolve(getScraperMetrics()), // Synchronous function
    Promise.resolve(getDetailedPerformanceMetrics()), // Synchronous function
    Promise.resolve(getSystemMetrics()), // Synchronous function
    Promise.resolve(getEnvironmentStatus()) // Synchronous function
  ]);
  
  const dashboardTime = Date.now() - startTime;
  
  // Build comprehensive dashboard response
  const dashboard = {
    timestamp: new Date().toISOString(),
    responseTime: dashboardTime,
    database: databaseMetrics.status === 'fulfilled' ? databaseMetrics.value : { error: 'Failed to fetch' },
    scraper: scraperMetrics.status === 'fulfilled' ? scraperMetrics.value : { error: 'Failed to fetch' },
    performance: performanceMetrics.status === 'fulfilled' ? performanceMetrics.value : { error: 'Failed to fetch' },
    system: systemMetrics.status === 'fulfilled' ? systemMetrics.value : { error: 'Failed to fetch' },
    environment: envStatus.status === 'fulfilled' ? envStatus.value : { error: 'Failed to fetch' },
    
    // Summary status
    status: {
      overall: 'operational',
      database: databaseMetrics.status === 'fulfilled' ? 'operational' : 'degraded',
      scraper: scraperMetrics.status === 'fulfilled' ? 'operational' : 'degraded',
      performance: performanceMetrics.status === 'fulfilled' ? 'operational' : 'degraded'
    }
  };

  return NextResponse.json(dashboard, { status: 200 });
});
