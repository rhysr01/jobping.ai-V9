import { NextResponse } from 'next/server';
import { createClient as createSupabaseClient } from '@supabase/supabase-js';
// import { criticalAlerts } from '@/Utils/criticalAlerts';

export async function GET() {
  const startTime = Date.now();
  
  try {
    // Check database connectivity
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
    
    if (!supabaseUrl || !supabaseKey) {
      return NextResponse.json({ 
        status: 'error', 
        message: 'Database configuration missing',
        timestamp: new Date().toISOString()
      }, { status: 500 });
    }
    
    const supabase = createSupabaseClient(supabaseUrl, supabaseKey);
    
    // Simple database health check
    const { error } = await supabase
      .from('users')
      .select('count')
      .limit(1);
    
    if (error) {
      // Alert for database issues
      await criticalAlerts.alertDatabaseIssue('health_check', error.message);
      
      return NextResponse.json({ 
        status: 'error', 
        message: 'Database connection failed',
        error: error.message,
        timestamp: new Date().toISOString()
      }, { status: 500 });
    }
    
    // Check environment variables
    const requiredEnvVars = [
      'OPENAI_API_KEY',
      'RAPIDAPI_KEY',
      'NEXT_PUBLIC_SUPABASE_URL',
      'SUPABASE_SERVICE_ROLE_KEY'
    ];
    
    const missingEnvVars = requiredEnvVars.filter(envVar => !process.env[envVar]);
    
    if (missingEnvVars.length > 0) {
      return NextResponse.json({ 
        status: 'error', 
        message: 'Missing required environment variables',
        missing: missingEnvVars,
        timestamp: new Date().toISOString()
      }, { status: 500 });
    }
    
    // Check alerting system status
    const alertStatus = criticalAlerts.getStatus();
    
    const responseTime = Date.now() - startTime;
    
    return NextResponse.json({ 
      status: 'healthy',
      timestamp: new Date().toISOString(),
      responseTime: `${responseTime}ms`,
      database: 'connected',
      environment: process.env.NODE_ENV || 'development',
      alerting: {
        slackConfigured: alertStatus.config.slackConfigured,
        emailConfigured: alertStatus.config.emailConfigured,
        openaiBudgetLimit: alertStatus.config.openaiBudgetLimit
      },
      uptime: process.uptime()
    });
    
  } catch (error) {
    const responseTime = Date.now() - startTime;
    
    // Alert for health check failures
    await criticalAlerts.alertApiFailure(
      '/api/health', 
      error instanceof Error ? error.message : String(error),
      500
    );
    
    return NextResponse.json({ 
      status: 'error', 
      message: 'Health check failed',
      error: error instanceof Error ? error.message : 'Unknown error',
      responseTime: `${responseTime}ms`,
      timestamp: new Date().toISOString()
    }, { status: 500 });
  }
}