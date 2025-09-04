import { NextRequest, NextResponse } from 'next/server';
import { productionMonitor } from '@/Utils/productionMonitoring';
import { getDatabaseClient } from '@/Utils/databasePool';
import { httpClient } from '@/Utils/httpClient';
import { tokenManager } from '@/Utils/tokenManager';

// Helper function to check Supabase health
async function checkSupabaseHealth(): Promise<'healthy' | 'degraded' | 'critical'> {
  try {
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
    
    if (!supabaseUrl || !supabaseKey) {
      return 'critical';
    }
    
    const supabase = createClient(supabaseUrl, supabaseKey, {
      auth: { autoRefreshToken: false, persistSession: false }
    });
    
    // Simple query to test connection
    const { data, error } = await supabase
      .from('users')
      .select('count')
      .limit(1);
    
    if (error) {
      console.error('Supabase health check error:', error);
      return 'degraded';
    }
    
    return 'healthy';
  } catch (error) {
    console.error('Supabase health check failed:', error);
    return 'critical';
  }
}

// Helper function to check Redis health
async function checkRedisHealth(): Promise<'healthy' | 'degraded' | 'critical'> {
  try {
    const redisUrl = process.env.REDIS_URL;
    
    if (!redisUrl) {
      return 'critical';
    }
    
    const redis = createRedisClient({ url: redisUrl });
    
    // Set a test key with short TTL
    await redis.set('health_check', 'ok', { EX: 10 });
    const result = await redis.get('health_check');
    await redis.quit();
    
    if (result === 'ok') {
      return 'healthy';
    } else {
      return 'degraded';
    }
  } catch (error) {
    console.error('Redis health check failed:', error);
    return 'critical';
  }
}

// Helper function to check OpenAI health
async function checkOpenAIHealth(): Promise<'healthy' | 'degraded' | 'critical'> {
  try {
    const openaiKey = process.env.OPENAI_API_KEY;
    
    if (!openaiKey) {
      return 'critical';
    }
    
    const openai = new OpenAI({ apiKey: openaiKey });
    
    // Simple API call to test connection
    const response = await openai.models.list();
    
    if (response && response.data) {
      return 'healthy';
    } else {
      return 'degraded';
    }
  } catch (error) {
    console.error('OpenAI health check failed:', error);
    return 'degraded';
  }
}

// Helper function to check Resend health
async function checkResendHealth(): Promise<'healthy' | 'degraded' | 'critical'> {
  try {
    const resendKey = process.env.RESEND_API_KEY;
    
    if (!resendKey) {
      return 'critical';
    }
    
    const { Resend } = require('resend');
    const resend = new Resend(resendKey);
    
    // Simple API call to test connection (list domains)
    const response = await resend.domains.list();
    
    if (response && response.data) {
      return 'healthy';
    } else {
      return 'degraded';
    }
  } catch (error) {
    console.error('Resend health check failed:', error);
    return 'degraded';
  }
}

// Helper function to get scraper status
function getScraperStatus() {
  const config = getScraperConfig();
  
  return {
    platforms: {
      greenhouse: config.enableGreenhouse,
      lever: config.enableLever,
      workday: config.enableWorkday,
      remoteok: config.enableRemoteOK,
      reliable: config.enableReliableScrapers,
      university: config.enableUniversityScrapers
    },
    features: {
      debugMode: config.debugMode,
      telemetry: config.enableTelemetry,
      rateLimiting: config.enableRateLimiting,
      browserPool: config.enableBrowserPool
    },
    settings: {
      batchSize: config.batchSize,
      maxRetries: config.maxRetries,
      requestsPerMinute: config.requestsPerMinute
    }
  };
}

// Helper function to get performance metrics
function getPerformanceMetrics() {
  const report = PerformanceMonitor.getPerformanceReport();
  
  return {
    operations: Object.keys(report),
    summary: {
      totalOperations: Object.keys(report).length,
      averageLatency: Object.values(report).reduce((sum: any, op: any) => 
        sum + (op.average || 0), 0) / Math.max(Object.keys(report).length, 1)
    },
    topOperations: Object.entries(report)
      .map(([name, stats]: [string, any]) => ({
        name,
        average: stats.average || 0,
        count: stats.count || 0
      }))
      .sort((a, b) => b.average - a.average)
      .slice(0, 5)
  };
}

// Comprehensive production health check
export async function GET() {
  try {
    const startTime = Date.now();
    
    // Get comprehensive system health from production monitor
    const systemHealth = await productionMonitor.getSystemHealth();
    
    // Get additional component statuses
    const dbStatus = await checkDatabaseStatus();
    const httpStatus = await checkHttpClientStatus();
    const tokenStatus = await checkTokenManagerStatus();
    
    const responseTime = Date.now() - startTime;
    
    return NextResponse.json({
      // Overall system status
      ok: systemHealth.ok,
      timestamp: new Date().toISOString(),
      responseTime: `${responseTime}ms`,
      
      // System health summary
      system: {
        overall: systemHealth.ok ? 'healthy' : 'critical',
        criticalIssues: systemHealth.criticalIssues.length,
        warnings: systemHealth.warnings.length,
        lastCheck: new Date(systemHealth.lastHealthCheck).toISOString()
      },
      
      // Component health
      components: {
        database: {
          status: systemHealth.components.database.status,
          responseTime: `${systemHealth.components.database.responseTime}ms`,
          details: dbStatus
        },
        httpClient: {
          status: systemHealth.components.httpClient.status,
          responseTime: `${systemHealth.components.httpClient.responseTime}ms`,
          details: httpStatus
        },
        email: {
          status: systemHealth.components.email.status,
          responseTime: `${systemHealth.components.email.responseTime}ms`,
          details: systemHealth.components.email.details
        },
        scrapers: {
          status: systemHealth.components.scrapers.status,
          responseTime: `${systemHealth.components.scrapers.responseTime}ms`,
          details: systemHealth.components.scrapers.details
        },
        matching: {
          status: systemHealth.components.matching.status,
          responseTime: `${systemHealth.components.matching.responseTime}ms`,
          details: systemHealth.components.matching.details
        }
      },
      
      // Performance metrics
      performance: {
        memoryUsage: `${Math.round(systemHealth.performance.memoryUsage / 1024 / 1024)}MB`,
        activeConnections: systemHealth.performance.activeConnections,
        uptime: `${Math.round(process.uptime())}s`
      },
      
      // Environment info
      environment: {
        nodeEnv: process.env.NODE_ENV,
        railway: !!process.env.RAILWAY_ENVIRONMENT,
        vercel: process.env.VERCEL === '1',
        region: process.env.VERCEL_REGION || 'unknown'
      }
    });
    
  } catch (error: any) {
    console.error('Health check failed:', error);
    
    return NextResponse.json({
      ok: false,
      error: error.message,
      timestamp: new Date().toISOString(),
      status: 'critical'
    }, { status: 500 });
  }
}

// Helper function to check database status
async function checkDatabaseStatus() {
  try {
    const db = getDatabaseClient();
    const { data, error } = await db
      .from('jobs')
      .select('count')
      .limit(1)
      .timeout(5000);
    
    if (error) {
      return { error: error.message, connected: false };
    }
    
    return { connected: true, tableAccess: true };
  } catch (error: any) {
    return { error: error.message, connected: false };
  }
}

// Helper function to check HTTP client status
async function checkHttpClientStatus() {
  try {
    const status = httpClient.getStatus();
    return {
      circuitBreaker: status.circuitBreaker.state,
      domains: status.domains.length,
      healthy: true
    };
  } catch (error: any) {
    return { error: error.message, healthy: false };
  }
}

// Helper function to check token manager status
async function checkTokenManagerStatus() {
  try {
    const stats = tokenManager.getUsageStats();
    return {
      dailyTokensRemaining: stats.tokens.dailyRemaining,
      dailyCostRemaining: stats.costs.dailyRemaining,
      healthy: true
    };
  } catch (error: any) {
    return { error: error.message, healthy: false };
  }
}
