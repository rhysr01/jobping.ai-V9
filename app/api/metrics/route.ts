import { NextRequest, NextResponse } from 'next/server';
import { withAuth } from '../../../lib/auth';
import { metricsCollector } from '../../../Utils/monitoring/metricsCollector';

const getMetricsHandler = async (request: NextRequest) => {
  const startTime = Date.now();
  
  try {
    console.log('📊 Collecting metrics...');
    
    // Get query parameters
    const { searchParams } = new URL(request.url);
    const hours = parseInt(searchParams.get('hours') || '1');
    
    // Validate hours parameter
    if (hours < 1 || hours > 168) { // Max 1 week
      return NextResponse.json({
        error: 'Invalid hours parameter. Must be between 1 and 168.'
      }, { status: 400 });
    }

    // Collect current metrics
    const currentMetrics = await metricsCollector.collectMetrics();
    
    // Get historical metrics if requested
    let historicalMetrics: any[] = [];
    if (hours > 1) {
      historicalMetrics = await metricsCollector.getMetricsHistory(hours);
    }

    const response = {
      current: currentMetrics,
      history: historicalMetrics,
      collection_time: Date.now() - startTime,
      requested_hours: hours
    };

    return NextResponse.json(response);

  } catch (error) {
    console.error('❌ Metrics collection error:', error);
    return NextResponse.json({
      error: 'Failed to collect metrics',
      message: error instanceof Error ? error.message : 'Unknown error',
      collection_time: Date.now() - startTime
    }, { status: 500 });
  }
};

// Export with auth wrapper
export const GET = withAuth(getMetricsHandler, {
  requireSystemKey: true,
  allowedMethods: ['GET'],
  rateLimit: true
});

// Health check endpoint
export async function HEAD() {
  return new NextResponse(null, { status: 200 });
}
