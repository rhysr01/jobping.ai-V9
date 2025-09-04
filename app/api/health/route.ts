import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

// Simple health check endpoint
export async function GET(request: NextRequest) {
  try {
    const healthStatus = {
      status: 'healthy',
      timestamp: new Date().toISOString(),
      services: {
        api: 'healthy',
        database: 'unknown',
        email: 'unknown'
      }
    };

    // Check database health
    try {
      const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
      const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
      
      if (supabaseUrl && supabaseKey) {
        const supabase = createClient(supabaseUrl, supabaseKey, {
          auth: { autoRefreshToken: false, persistSession: false }
        });
        
        // Simple query to test connection
        const { data, error } = await supabase
          .from('jobs')
          .select('id')
          .limit(1);
        
        if (!error) {
          healthStatus.services.database = 'healthy';
        } else {
          healthStatus.services.database = 'degraded';
        }
      } else {
        healthStatus.services.database = 'critical';
      }
    } catch (error) {
      healthStatus.services.database = 'critical';
    }

    // Check email service health
    try {
      const resendKey = process.env.RESEND_API_KEY;
      if (resendKey) {
        healthStatus.services.email = 'healthy';
      } else {
        healthStatus.services.email = 'critical';
      }
    } catch (error) {
      healthStatus.services.email = 'critical';
    }

    // Determine overall status
    const criticalServices = Object.values(healthStatus.services).filter(s => s === 'critical').length;
    const degradedServices = Object.values(healthStatus.services).filter(s => s === 'degraded').length;
    
    if (criticalServices > 0) {
      healthStatus.status = 'critical';
    } else if (degradedServices > 0) {
      healthStatus.status = 'degraded';
    }

    const statusCode = healthStatus.status === 'healthy' ? 200 : 
                     healthStatus.status === 'degraded' ? 200 : 503;

    return NextResponse.json(healthStatus, { status: statusCode });
    
  } catch (error) {
    console.error('Health check failed:', error);
    return NextResponse.json({
      status: 'critical',
      timestamp: new Date().toISOString(),
      error: 'Health check failed',
      services: {
        api: 'critical',
        database: 'unknown',
        email: 'unknown'
      }
    }, { status: 503 });
  }
}
