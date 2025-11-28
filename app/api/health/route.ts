import { NextRequest, NextResponse } from 'next/server';
import { getDatabaseClient } from '@/Utils/databasePool';
import { createClient as createRedisClient } from 'redis';

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

type HealthStatus = 'healthy' | 'degraded' | 'unhealthy';

type ServiceCheck = {
  status: HealthStatus;
  message: string;
  latencyMs?: number;
  details?: Record<string, unknown>;
};

const HEALTH_SLO_MS = 100; // SLO: health checks should respond in <100ms

export async function GET(req: NextRequest) {
  const start = Date.now();
  const requestId = getRequestId(req);
  
  try {
    const [database, redis, openai] = await Promise.all([
      checkDatabase(),
      checkRedis(),
      checkOpenAI()
    ]);

    const environment = checkEnvironment();
    const services = { database, redis, openai };

    const duration = Date.now() - start;

    if (duration > HEALTH_SLO_MS) {
      console.warn(`Health check SLO violation: ${duration}ms > ${HEALTH_SLO_MS}ms target`);
    }

    const overallStatus = deriveOverallStatus([
      environment.status as HealthStatus,
      ...Object.values(services).map((service) => service.status)
    ]);
    const ok = overallStatus === 'healthy';

    // Health endpoint uses custom format for monitoring tools - keep format but add requestId
    const response = NextResponse.json(
      {
        ok,
        status: overallStatus,
        services,
        environment,
        uptimeSeconds: process.uptime(),
        responseTime: duration,
        timestamp: new Date().toISOString(),
        requestId,
        slo: {
          targetMs: HEALTH_SLO_MS,
          actualMs: duration,
          met: duration <= HEALTH_SLO_MS
        }
      },
      {
        status: overallStatus === 'unhealthy' ? 503 : 200
      }
    );
    response.headers.set('x-request-id', requestId);
    return response;
  } catch (error) {
    console.error('Health check failed:', error);
    const duration = Date.now() - start;
    const response = NextResponse.json({ 
      ok: false,
      status: 'unhealthy',
      error: 'Health check failed',
      requestId,
      responseTime: duration,
      duration: duration,
      slo: {
        target: HEALTH_SLO_MS,
        actual: duration,
        met: duration <= HEALTH_SLO_MS
      }
    }, { status: 503 });
    response.headers.set('x-request-id', requestId);
    return response;
  }
}

async function checkDatabase(): Promise<ServiceCheck> {
  const started = Date.now();
  try {
    const supabase = getDatabaseClient();
    const { error } = await supabase.from('users').select('count').limit(1);
    
    if (error) {
      return { status: 'unhealthy', message: 'Database connection failed', details: { error: error.message } };
    }
    
    return { status: 'healthy', message: 'Database connection OK', latencyMs: Date.now() - started };
  } catch (error) {
    return { 
      status: 'unhealthy', 
      message: error instanceof Error ? error.message : 'Unknown database error',
      details: { error }
    };
  }
}

function checkEnvironment(): { status: HealthStatus; message: string; missing: string[] } {
  const requiredVars = [
    'NEXT_PUBLIC_SUPABASE_URL',
    'SUPABASE_SERVICE_ROLE_KEY',
    'REDIS_URL',
    'OPENAI_API_KEY',
    'RESEND_API_KEY',
    'POLAR_ACCESS_TOKEN'
  ];

  const missing = requiredVars.filter((varName) => !process.env[varName]);

  if (missing.length > 0) {
    return { 
      status: missing.length === requiredVars.length ? 'unhealthy' : 'degraded',
      message: `Missing environment variables: ${missing.join(', ')}`,
      missing
    };
  }

  return { status: 'healthy', message: 'All required environment variables present', missing: [] };
}

async function checkRedis(): Promise<ServiceCheck> {
  const url = process.env.REDIS_URL;
  if (!url) {
    return { status: 'degraded', message: 'REDIS_URL not configured' };
  }

  const started = Date.now();
  const client = createRedisClient({
    url,
    socket: {
      connectTimeout: 2000
    }
  });

  try {
    await client.connect();
    const pong = await client.ping();
    return {
      status: pong === 'PONG' ? 'healthy' : 'degraded',
      message: `Redis ping: ${pong}`,
      latencyMs: Date.now() - started
    };
  } catch (error) {
    return {
      status: 'unhealthy',
      message: error instanceof Error ? error.message : 'Redis connection failed',
      details: { error }
    };
  } finally {
    try {
      if (client.isOpen) {
        await client.quit();
      }
    } catch (closeError) {
      console.warn('Failed to close Redis client during health check', closeError);
    }
  }
}

async function checkOpenAI(): Promise<ServiceCheck> {
  const apiKey = process.env.OPENAI_API_KEY;
  if (!apiKey) {
    return { status: 'degraded', message: 'OPENAI_API_KEY not configured' };
  }

  const started = Date.now();
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 3000);

  try {
    const response = await fetch('https://api.openai.com/v1/models', {
      method: 'GET',
      headers: {
        Authorization: `Bearer ${apiKey}`,
        'Content-Type': 'application/json'
      },
      signal: controller.signal
    });

    const latencyMs = Date.now() - started;

    if (!response.ok) {
      return {
        status: response.status >= 500 ? 'unhealthy' : 'degraded',
        message: `OpenAI API responded with status ${response.status}`,
        details: { statusText: response.statusText },
        latencyMs
      };
    }

    return {
      status: 'healthy',
      message: 'OpenAI API reachable',
      latencyMs
    };
  } catch (error) {
    return {
      status: 'unhealthy',
      message: error instanceof Error ? error.message : 'OpenAI check failed',
      details: { error }
    };
  } finally {
    clearTimeout(timeout);
  }
}

function deriveOverallStatus(statuses: HealthStatus[]): HealthStatus {
  if (statuses.includes('unhealthy')) {
    return 'unhealthy';
  }

  if (statuses.includes('degraded')) {
    return 'degraded';
  }

  return 'healthy';
}
