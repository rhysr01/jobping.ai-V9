import { NextRequest, NextResponse } from 'next/server';
import { getProductionRateLimiter } from '@/Utils/productionRateLimiter';
import { createClient } from '@supabase/supabase-js';
import { createClient as createRedisClient } from 'redis';
import OpenAI from 'openai';
import { PerformanceMonitor } from '@/Utils/performanceMonitor';
import { getScraperConfig, logScraperConfig } from '@/Utils/scraperConfig';

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

// Add Vercel-specific health check
export async function GET() {
  const isVercel = process.env.VERCEL === '1';
  
  // Import Railway config
  const { CFG } = await import('@/Utils/railwayConfig');
  
  return NextResponse.json({
    ok: true,
    env: CFG.env,
    mode: CFG.useBrowser ? 'puppeteer' : 'axios',
    rateLimit: CFG.rateLimitEnabled ? 'on' : 'off',
    rpm: CFG.rpm,
    rph: CFG.rph,
    ts: new Date().toISOString(),
    environment: process.env.NODE_ENV,
    version: process.env.VERCEL_GIT_COMMIT_SHA || 'local',
    platform: isVercel ? 'vercel' : 'local',
    region: process.env.VERCEL_REGION || 'unknown',
    uptime: process.uptime()
  });
}
