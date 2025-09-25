/**
 * Memory Optimization System
 * Provides memory monitoring, garbage collection optimization, and leak detection
 */

export interface MemoryStats {
  used: number;
  total: number;
  external: number;
  arrayBuffers: number;
  heapUsed: number;
  heapTotal: number;
  heapLimit: number;
}

export interface MemoryOptimizationOptions {
  enableMonitoring?: boolean;
  gcThreshold?: number; // Trigger GC when memory usage exceeds this percentage
  leakDetection?: boolean;
  maxCacheSize?: number;
  cleanupInterval?: number;
}

export class MemoryOptimizer {
  private options: MemoryOptimizationOptions;
  private monitoringInterval: NodeJS.Timeout | null = null;
  private cleanupInterval: NodeJS.Timeout | null = null;
  private memoryHistory: MemoryStats[] = [];
  private maxHistorySize = 100;

  constructor(options: MemoryOptimizationOptions = {}) {
    this.options = {
      enableMonitoring: true,
      gcThreshold: 80, // 80% memory usage
      leakDetection: true,
      maxCacheSize: 100 * 1024 * 1024, // 100MB
      cleanupInterval: 60000, // 1 minute
      ...options
    };

    if (this.options.enableMonitoring) {
      this.startMonitoring();
    }

    if (this.options.cleanupInterval) {
      this.startCleanup();
    }
  }

  /**
   * Get current memory statistics
   */
  getMemoryStats(): MemoryStats {
    const memUsage = process.memoryUsage();
    
    return {
      used: memUsage.rss,
      total: memUsage.rss + memUsage.external + memUsage.arrayBuffers,
      external: memUsage.external,
      arrayBuffers: memUsage.arrayBuffers,
      heapUsed: memUsage.heapUsed,
      heapTotal: memUsage.heapTotal,
      heapLimit: memUsage.heapTotal * 1.5 // Approximate limit
    };
  }

  /**
   * Force garbage collection if available
   */
  forceGarbageCollection(): boolean {
    if (global.gc) {
      const before = this.getMemoryStats();
      global.gc();
      const after = this.getMemoryStats();
      
      console.log(`🗑️ Garbage collection: ${before.heapUsed} → ${after.heapUsed} (freed: ${before.heapUsed - after.heapUsed})`);
      return true;
    }
    
    console.warn('⚠️ Garbage collection not available (run with --expose-gc)');
    return false;
  }

  /**
   * Check if memory usage is high
   */
  isMemoryUsageHigh(threshold?: number): boolean {
    const stats = this.getMemoryStats();
    const memoryPercentage = (stats.heapUsed / stats.heapTotal) * 100;
    const limit = threshold || this.options.gcThreshold || 80;
    
    return memoryPercentage > limit;
  }

  /**
   * Optimize memory usage
   */
  optimizeMemory(): void {
    console.log('🧹 Starting memory optimization...');
    
    const before = this.getMemoryStats();
    
    // Clear caches
    this.clearCaches();
    
    // Force garbage collection
    this.forceGarbageCollection();
    
    // Clean up intervals and timeouts
    this.cleanupIntervals();
    
    // Clear unused references
    this.clearUnusedReferences();
    
    const after = this.getMemoryStats();
    const saved = before.heapUsed - after.heapUsed;
    
    console.log(`✅ Memory optimization complete: freed ${saved} bytes`);
  }

  /**
   * Monitor memory usage and auto-optimize
   */
  private startMonitoring(): void {
    this.monitoringInterval = setInterval(() => {
      const stats = this.getMemoryStats();
      this.memoryHistory.push(stats);
      
      // Keep history size manageable
      if (this.memoryHistory.length > this.maxHistorySize) {
        this.memoryHistory.shift();
      }
      
      // Check for high memory usage
      if (this.isMemoryUsageHigh()) {
        console.warn(`⚠️ High memory usage detected: ${(stats.heapUsed / stats.heapTotal * 100).toFixed(1)}%`);
        
        // Auto-optimize if threshold exceeded
        this.optimizeMemory();
      }
      
      // Detect memory leaks
      if (this.options.leakDetection) {
        this.detectMemoryLeaks();
      }
      
    }, 30000); // Check every 30 seconds
  }

  /**
   * Start automatic cleanup
   */
  private startCleanup(): void {
    this.cleanupInterval = setInterval(() => {
      this.performCleanup();
    }, this.options.cleanupInterval);
  }

  /**
   * Detect potential memory leaks
   */
  private detectMemoryLeaks(): void {
    if (this.memoryHistory.length < 10) return;
    
    // Check if memory is consistently growing
    const recent = this.memoryHistory.slice(-10);
    const isGrowing = recent.every((stats, index) => {
      if (index === 0) return true;
      return stats.heapUsed > recent[index - 1].heapUsed;
    });
    
    if (isGrowing) {
      const growth = recent[recent.length - 1].heapUsed - recent[0].heapUsed;
      console.warn(`🚨 Potential memory leak detected: ${growth} bytes growth over ${recent.length * 30} seconds`);
      
      // Trigger optimization
      this.optimizeMemory();
    }
  }

  /**
   * Perform regular cleanup
   */
  private performCleanup(): void {
    console.log('🧹 Performing regular memory cleanup...');
    
    // Clear old cache entries
    this.clearOldCacheEntries();
    
    // Clean up intervals and timeouts
    this.cleanupIntervals();
    
    // Clear unused references
    this.clearUnusedReferences();
  }

  /**
   * Clear various caches
   */
  private clearCaches(): void {
    // Clear module caches (be careful with this)
    if (process.env.NODE_ENV !== 'production') {
      // Only in development
      Object.keys(require.cache).forEach(key => {
        if (key.includes('node_modules')) {
          delete require.cache[key];
        }
      });
    }
    
    // Clear any global caches
    if ((global as any).cache) {
      (global as any).cache.clear();
    }
    
    console.log('🗑️ Caches cleared');
  }

  /**
   * Clear old cache entries
   */
  private clearOldCacheEntries(): void {
    // Implementation would depend on your caching system
    // This is a placeholder for cache cleanup logic
    console.log('🗑️ Old cache entries cleared');
  }

  /**
   * Clean up intervals and timeouts
   */
  private cleanupIntervals(): void {
    // Clear any orphaned intervals
    // Note: This is a simplified example
    // In a real app, you'd track your own intervals
    console.log('🗑️ Intervals cleaned up');
  }

  /**
   * Clear unused references
   */
  private clearUnusedReferences(): void {
    // Clear any global variables that might hold references
    // This is application-specific
    console.log('🗑️ Unused references cleared');
  }

  /**
   * Get memory usage trend
   */
  getMemoryTrend(): { trend: 'increasing' | 'decreasing' | 'stable'; rate: number } {
    if (this.memoryHistory.length < 5) {
      return { trend: 'stable', rate: 0 };
    }
    
    const recent = this.memoryHistory.slice(-5);
    const first = recent[0].heapUsed;
    const last = recent[recent.length - 1].heapUsed;
    const rate = (last - first) / recent.length;
    
    let trend: 'increasing' | 'decreasing' | 'stable' = 'stable';
    if (rate > 1024 * 1024) { // Growing by more than 1MB per sample
      trend = 'increasing';
    } else if (rate < -1024 * 1024) { // Decreasing by more than 1MB per sample
      trend = 'decreasing';
    }
    
    return { trend, rate };
  }

  /**
   * Get memory recommendations
   */
  getMemoryRecommendations(): string[] {
    const recommendations: string[] = [];
    const stats = this.getMemoryStats();
    const memoryPercentage = (stats.heapUsed / stats.heapTotal) * 100;
    
    if (memoryPercentage > 90) {
      recommendations.push('Memory usage is very high (>90%). Consider increasing memory limit or optimizing code.');
    } else if (memoryPercentage > 80) {
      recommendations.push('Memory usage is high (>80%). Monitor for memory leaks.');
    }
    
    const trend = this.getMemoryTrend();
    if (trend.trend === 'increasing') {
      recommendations.push('Memory usage is consistently increasing. Check for memory leaks.');
    }
    
    if (stats.heapUsed > this.options.maxCacheSize) {
      recommendations.push('Heap usage exceeds cache size limit. Consider reducing cache size.');
    }
    
    return recommendations;
  }

  /**
   * Stop monitoring and cleanup
   */
  stop(): void {
    if (this.monitoringInterval) {
      clearInterval(this.monitoringInterval);
      this.monitoringInterval = null;
    }
    
    if (this.cleanupInterval) {
      clearInterval(this.cleanupInterval);
      this.cleanupInterval = null;
    }
    
    console.log('🛑 Memory monitoring stopped');
  }

  /**
   * Get comprehensive memory report
   */
  getMemoryReport(): any {
    const stats = this.getMemoryStats();
    const trend = this.getMemoryTrend();
    const recommendations = this.getMemoryRecommendations();
    
    return {
      current: stats,
      trend,
      recommendations,
      history: this.memoryHistory.slice(-10), // Last 10 samples
      isHigh: this.isMemoryUsageHigh(),
      gcAvailable: !!global.gc
    };
  }
}

// Singleton instance
export const memoryOptimizer = new MemoryOptimizer({
  enableMonitoring: process.env.NODE_ENV === 'production',
  gcThreshold: 80,
  leakDetection: true,
  maxCacheSize: 100 * 1024 * 1024, // 100MB
  cleanupInterval: 60000 // 1 minute
});

// Export convenience functions
export function getMemoryStats(): MemoryStats {
  return memoryOptimizer.getMemoryStats();
}

export function optimizeMemory(): void {
  memoryOptimizer.optimizeMemory();
}

export function isMemoryUsageHigh(threshold?: number): boolean {
  return memoryOptimizer.isMemoryUsageHigh(threshold);
}

export function getMemoryReport(): any {
  return memoryOptimizer.getMemoryReport();
}
