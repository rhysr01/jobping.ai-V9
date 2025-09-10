/**
 * Quick Performance Monitor
 * 
 * Simple performance tracking without external dependencies
 * Tracks key metrics for optimization insights
 */

interface PerformanceMetric {
  name: string;
  startTime: number;
  endTime?: number;
  duration?: number;
  metadata?: Record<string, any>;
}

class QuickPerformanceMonitor {
  private metrics: Map<string, PerformanceMetric> = new Map();
  private completedMetrics: PerformanceMetric[] = [];

  /**
   * Start timing an operation
   */
  start(name: string, metadata?: Record<string, any>): void {
    this.metrics.set(name, {
      name,
      startTime: Date.now(),
      metadata
    });
  }

  /**
   * End timing an operation
   */
  end(name: string): number | null {
    const metric = this.metrics.get(name);
    if (!metric) {
      console.warn(`Performance metric '${name}' not found`);
      return null;
    }

    const endTime = Date.now();
    const duration = endTime - metric.startTime;
    
    metric.endTime = endTime;
    metric.duration = duration;
    
    this.completedMetrics.push(metric);
    this.metrics.delete(name);
    
    return duration;
  }

  /**
   * Get performance summary
   */
  getSummary(): {
    totalOperations: number;
    averageDuration: number;
    slowestOperations: Array<{ name: string; duration: number; metadata?: any }>;
    fastestOperations: Array<{ name: string; duration: number; metadata?: any }>;
  } {
    if (this.completedMetrics.length === 0) {
      return {
        totalOperations: 0,
        averageDuration: 0,
        slowestOperations: [],
        fastestOperations: []
      };
    }

    const durations = this.completedMetrics.map(m => m.duration!);
    const averageDuration = durations.reduce((a, b) => a + b, 0) / durations.length;

    const sortedByDuration = [...this.completedMetrics]
      .sort((a, b) => (b.duration || 0) - (a.duration || 0));

    return {
      totalOperations: this.completedMetrics.length,
      averageDuration: Math.round(averageDuration),
      slowestOperations: sortedByDuration.slice(0, 5).map(m => ({
        name: m.name,
        duration: m.duration!,
        metadata: m.metadata
      })),
      fastestOperations: sortedByDuration.slice(-5).map(m => ({
        name: m.name,
        duration: m.duration!,
        metadata: m.metadata
      }))
    };
  }

  /**
   * Log performance summary
   */
  logSummary(): void {
    const summary = this.getSummary();
    
    console.log('📊 Performance Summary:');
    console.log(`  Total Operations: ${summary.totalOperations}`);
    console.log(`  Average Duration: ${summary.averageDuration}ms`);
    
    if (summary.slowestOperations.length > 0) {
      console.log('  🐌 Slowest Operations:');
      summary.slowestOperations.forEach(op => {
        console.log(`    ${op.name}: ${op.duration}ms`);
      });
    }
    
    if (summary.fastestOperations.length > 0) {
      console.log('  ⚡ Fastest Operations:');
      summary.fastestOperations.forEach(op => {
        console.log(`    ${op.name}: ${op.duration}ms`);
      });
    }
  }

  /**
   * Clear all metrics
   */
  clear(): void {
    this.metrics.clear();
    this.completedMetrics = [];
  }
}

// Export singleton instance
export const quickPerformanceMonitor = new QuickPerformanceMonitor();

/**
 * Decorator for automatic performance monitoring
 */
export function monitorPerformance(name: string, metadata?: Record<string, any>) {
  return function (target: any, propertyName: string, descriptor: PropertyDescriptor) {
    const method = descriptor.value;
    
    descriptor.value = async function (...args: any[]) {
      quickPerformanceMonitor.start(`${name}.${propertyName}`, metadata);
      try {
        const result = await method.apply(this, args);
        quickPerformanceMonitor.end(`${name}.${propertyName}`);
        return result;
      } catch (error) {
        quickPerformanceMonitor.end(`${name}.${propertyName}`);
        throw error;
      }
    };
  };
}

/**
 * Simple timing utility
 */
export function timeOperation<T>(name: string, operation: () => T | Promise<T>): Promise<T> {
  return new Promise(async (resolve, reject) => {
    quickPerformanceMonitor.start(name);
    try {
      const result = await operation();
      const duration = quickPerformanceMonitor.end(name);
      console.log(`⏱️  ${name}: ${duration}ms`);
      resolve(result);
    } catch (error) {
      quickPerformanceMonitor.end(name);
      reject(error);
    }
  });
}
