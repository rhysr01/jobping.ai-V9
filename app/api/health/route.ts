import { NextRequest, NextResponse } from 'next/server';
import { createUnifiedHandler, RATE_LIMITS } from '@/Utils/api/unified-api-handler';
import { getSupabaseClient } from '@/Utils/supabase';

export const GET = createUnifiedHandler(async (_req: NextRequest) => {
  const start = Date.now();
  
  // Simple health checks using existing patterns
  const checks = {
    database: await checkDatabase(),
    environment: checkEnvironment(),
    uptime: process.uptime()
  };

  const duration = Date.now() - start;
  const healthy = Object.values(checks).every(check => 
    typeof check === 'number' ? true : 
    typeof check === 'boolean' ? check : 
    check.status === 'healthy'
  );

  return NextResponse.json({ 
    ok: healthy,
    status: healthy ? 'healthy' : 'degraded',
    checks,
    responseTime: duration,
    timestamp: new Date().toISOString()
  }, { 
    status: healthy ? 200 : 503 
  });
}, {
  rateLimit: RATE_LIMITS.GENERAL,
  allowedMethods: ['GET']
});

async function checkDatabase(): Promise<{ status: string; message: string }> {
  try {
    const supabase = getSupabaseClient();
    const { error } = await supabase.from('users').select('count').limit(1);
    
    if (error) {
      return { status: 'unhealthy', message: 'Database connection failed' };
    }
    
    return { status: 'healthy', message: 'Database connection OK' };
  } catch (error) {
    return { 
      status: 'unhealthy', 
      message: error instanceof Error ? error.message : 'Unknown database error' 
    };
  }
}

function checkEnvironment(): { status: string; message: string } {
  const requiredVars = ['SUPABASE_URL', 'SUPABASE_SERVICE_ROLE_KEY', 'OPEN_API_KEY', 'RESEND_API_KEY'];
  const missing = requiredVars.filter(varName => !process.env[varName]);
  
  if (missing.length > 0) {
    return { 
      status: 'unhealthy', 
      message: `Missing environment variables: ${missing.join(', ')}` 
    };
  }
  
  return { status: 'healthy', message: 'All required environment variables present' };
}
