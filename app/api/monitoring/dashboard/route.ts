import { NextRequest, NextResponse } from 'next/server';
import { healthChecker } from '@/Utils/monitoring/healthChecker';
import { metricsCollector } from '@/Utils/monitoring/metricsCollector';

const getDashboardHandler = async (request: NextRequest) => {
  const startTime = Date.now();
  
  try {
    console.log(' Generating monitoring dashboard...');
    
    // Collect all monitoring data in parallel
    const [
      healthResult,
      metrics,
      activeAlerts
    ] = await Promise.allSettled([
      healthChecker.performHealthCheck(),
      metricsCollector.collectMetrics(),
      Promise.resolve([]) // alertingSystem.getActiveAlerts() - temporarily disabled
    ]);

    const dashboard = {
      timestamp: new Date().toISOString(),
      generation_time: Date.now() - startTime,
      health: healthResult.status === 'fulfilled' ? healthResult.value : null,
      metrics: metrics.status === 'fulfilled' ? metrics.value : null,
      alerts: activeAlerts.status === 'fulfilled' ? activeAlerts.value : [],
      summary: {
        overall_status: healthResult.status === 'fulfilled' ? healthResult.value.status : 'unknown',
        total_alerts: activeAlerts.status === 'fulfilled' ? activeAlerts.value.length : 0,
        critical_alerts: activeAlerts.status === 'fulfilled' ? 
          activeAlerts.value.filter((alert: any) => alert.type === 'critical').length : 0,
        system_uptime: process.uptime(),
        memory_usage: process.memoryUsage()
      }
    };

    return NextResponse.json(dashboard);

  } catch (error) {
    console.error(' Dashboard generation error:', error);
    return NextResponse.json({
      error: 'Failed to generate dashboard',
      message: error instanceof Error ? error.message : 'Unknown error',
      generation_time: Date.now() - startTime
    }, { status: 500 });
  }
};

// Export handler directly
export const GET = getDashboardHandler;

// Health check endpoint
export async function HEAD() {
  return new NextResponse(null, { status: 200 });
}
