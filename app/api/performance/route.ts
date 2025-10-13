import { NextRequest, NextResponse } from 'next/server';
import { withAuth } from '../../../lib/auth';
import { getMemoryStats, getMemoryReport, isMemoryUsageHigh } from '../../../Utils/performance/memoryOptimizer';
import { queryOptimizer } from '../../../Utils/performance/queryOptimizer';
import { responseOptimizer } from '../../../Utils/performance/responseOptimizer';

const getPerformanceHandler = async (request: NextRequest) => {
  const startTime = Date.now();
  
  try {
    console.log('⚡ Collecting performance metrics...');
    
    // Get query parameters
    const { searchParams } = new URL(request.url);
    const includeRecommendations = searchParams.get('recommendations') === 'true';
    
    // Collect performance data in parallel
    const [
      memoryStats,
      memoryReport,
      queryCacheStats,
      responseCacheStats
    ] = await Promise.allSettled([
      Promise.resolve(getMemoryStats()),
      Promise.resolve(getMemoryReport()),
      Promise.resolve(queryOptimizer.getCacheStats()),
      Promise.resolve(responseOptimizer.getCacheStats())
    ]);

    const performanceData = {
      timestamp: new Date().toISOString(),
      collection_time: Date.now() - startTime,
      memory: {
        current: memoryStats.status === 'fulfilled' ? memoryStats.value : null,
        report: memoryReport.status === 'fulfilled' ? memoryReport.value : null,
        is_high: memoryStats.status === 'fulfilled' ? isMemoryUsageHigh() : false
      },
      caches: {
        query_cache: queryCacheStats.status === 'fulfilled' ? queryCacheStats.value : null,
        response_cache: responseCacheStats.status === 'fulfilled' ? responseCacheStats.value : null
      },
      system: {
        uptime: process.uptime(),
        node_version: process.version,
        platform: process.platform,
        arch: process.arch,
        cpu_usage: process.cpuUsage(),
        memory_usage: process.memoryUsage()
      }
    };

    // Add recommendations if requested
    if (includeRecommendations) {
      (performanceData as any).recommendations = generatePerformanceRecommendations(performanceData);
    }

    return NextResponse.json(performanceData);

  } catch (error) {
    console.error('❌ Performance collection error:', error);
    return NextResponse.json({
      error: 'Failed to collect performance metrics',
      message: error instanceof Error ? error.message : 'Unknown error',
      collection_time: Date.now() - startTime
    }, { status: 500 });
  }
};

const optimizePerformanceHandler = async (request: NextRequest) => {
  const startTime = Date.now();
  
  try {
    console.log('🧹 Starting performance optimization...');
    
    const optimizationResults = {
      timestamp: new Date().toISOString(),
      optimization_time: Date.now() - startTime,
      actions: [] as string[],
      memory_before: getMemoryStats(),
      memory_after: null as any,
      cache_clears: {
        query_cache: false,
        response_cache: false
      }
    };

    // Clear query cache
    try {
      queryOptimizer.clearCache();
      optimizationResults.actions.push('Query cache cleared');
      optimizationResults.cache_clears.query_cache = true;
    } catch (error) {
      console.error('Failed to clear query cache:', error);
      optimizationResults.actions.push('Query cache clear failed');
    }

    // Clear response cache
    try {
      responseOptimizer.clearCache();
      optimizationResults.actions.push('Response cache cleared');
      optimizationResults.cache_clears.response_cache = true;
    } catch (error) {
      console.error('Failed to clear response cache:', error);
      optimizationResults.actions.push('Response cache clear failed');
    }

    optimizationResults.actions.push('Performance analysis complete');

    // Get memory stats after optimization
    optimizationResults.memory_after = getMemoryStats();
    
    const memorySaved = optimizationResults.memory_before.heapUsed - optimizationResults.memory_after.heapUsed;
    optimizationResults.actions.push(`Memory freed: ${memorySaved} bytes`);

    console.log(`✅ Performance optimization completed in ${optimizationResults.optimization_time}ms`);

    return NextResponse.json(optimizationResults);

  } catch (error) {
    console.error('❌ Performance optimization error:', error);
    return NextResponse.json({
      error: 'Failed to optimize performance',
      message: error instanceof Error ? error.message : 'Unknown error',
      optimization_time: Date.now() - startTime
    }, { status: 500 });
  }
};

function generatePerformanceRecommendations(performanceData: any): string[] {
  const recommendations: string[] = [];
  
  // Memory recommendations
  if (performanceData.memory.is_high) {
    recommendations.push('High memory usage detected. Consider running performance optimization.');
  }
  
  if (performanceData.memory.report?.trend?.trend === 'increasing') {
    recommendations.push('Memory usage is increasing. Check for memory leaks.');
  }
  
  // Cache recommendations
  if (performanceData.caches.query_cache?.size > 1000) {
    recommendations.push('Query cache is large. Consider clearing or reducing cache size.');
  }
  
  if (performanceData.caches.response_cache?.size > 500) {
    recommendations.push('Response cache is large. Consider clearing or reducing cache size.');
  }
  
  // System recommendations
  const memoryUsage = performanceData.system.memory_usage;
  const memoryPercentage = (memoryUsage.heapUsed / memoryUsage.heapTotal) * 100;
  
  if (memoryPercentage > 80) {
    recommendations.push('Heap usage is high (>80%). Consider optimizing memory usage.');
  }
  
  if (performanceData.system.uptime > 86400) { // 24 hours
    recommendations.push('Server has been running for over 24 hours. Consider restarting for optimal performance.');
  }
  
  return recommendations;
}

// Export with auth wrapper
export const GET = withAuth(getPerformanceHandler, {
  requireSystemKey: true,
  allowedMethods: ['GET'],
  rateLimit: true
});

export const POST = withAuth(optimizePerformanceHandler, {
  requireSystemKey: true,
  allowedMethods: ['POST'],
  rateLimit: true
});

// Health check endpoint
export async function HEAD() {
  return new NextResponse(null, { status: 200 });
}
