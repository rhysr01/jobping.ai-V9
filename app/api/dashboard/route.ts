import { NextRequest, NextResponse } from 'next/server';
import { getProductionRateLimiter } from '@/Utils/productionRateLimiter';
import { getSupabaseClient } from '@/Utils/supabase';

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
    enabledPlatforms: ['adzuna', 'reed', 'muse', 'jsearch', 'greenhouse'],
    
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
  // const report = PerformanceMonitor.getPerformanceReport();
  
  const operations: any[] = [];
  
  const totalOperations = 0;
  const averageLatency = 0;
  
  return {
    summary: {
      totalOperations,
      uniqueOperations: operations.length,
      averageLatency: Math.round(averageLatency),
      slowestOperation: operations.sort((a, b) => b.average - a.average)[0]?.name || 'none'
    },
    operations: operations.sort((a, b) => b.count - a.count).slice(0, 10), // Top 10 by volume
    slowestOperations: operations.sort((a, b) => b.average - a.average).slice(0, 5) // Top 5 by latency
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

export async function GET(req: NextRequest) {
  // PRODUCTION: Rate limiting for dashboard endpoint
  const rateLimitResult = await getProductionRateLimiter().middleware(req, 'dashboard', {
    windowMs: 60 * 1000, // 1 minute
    maxRequests: 30 // 30 requests per minute for dashboard
  });
  if (rateLimitResult) {
    return rateLimitResult;
  }

  try {
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
  } catch (error) {
    console.error('Dashboard generation failed:', error);
    return NextResponse.json(
      { 
        error: 'Dashboard generation failed',
        timestamp: new Date().toISOString()
      }, 
      { status: 500 }
    );
  }
}
