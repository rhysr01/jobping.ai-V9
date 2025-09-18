/**
 * Memory Management and Cleanup Utilities
 * Provides memory optimization and cleanup for long-running processes
 */

// ================================
// MEMORY MANAGEMENT CONFIGURATION
// ================================

export interface MemoryConfig {
  maxMemoryUsage: number; // Maximum memory usage in MB
  gcThreshold: number; // Memory threshold to trigger garbage collection
  cleanupInterval: number; // Cleanup interval in milliseconds
  enableMonitoring: boolean;
}

export interface MemoryStats {
  used: number;
  total: number;
  free: number;
  percentage: number;
  timestamp: number;
}

// ================================
// MEMORY MANAGER CLASS
// ================================

export class MemoryManager {
  private config: MemoryConfig;
  private cleanupCallbacks: Set<() => void> = new Set();
  private monitoringInterval: NodeJS.Timeout | null = null;
  private lastGcTime: number = 0;

  constructor(config: Partial<MemoryConfig> = {}) {
    this.config = {
      maxMemoryUsage: config.maxMemoryUsage || 512, // 512MB default
      gcThreshold: config.gcThreshold || 0.8, // 80% threshold
      cleanupInterval: config.cleanupInterval || 30000, // 30 seconds
      enableMonitoring: config.enableMonitoring !== false
    };

    if (this.config.enableMonitoring) {
      this.startMonitoring();
    }
  }

  /**
   * Get current memory usage statistics
   */
  getMemoryStats(): MemoryStats {
    const memUsage = process.memoryUsage();
    const used = Math.round(memUsage.heapUsed / 1024 / 1024); // MB
    const total = Math.round(memUsage.heapTotal / 1024 / 1024); // MB
    const free = total - used;
    const percentage = (used / total) * 100;

    return {
      used,
      total,
      free,
      percentage,
      timestamp: Date.now()
    };
  }

  /**
   * Check if memory usage is above threshold
   */
  isMemoryHigh(): boolean {
    const stats = this.getMemoryStats();
    return stats.percentage > (this.config.gcThreshold * 100);
  }

  /**
   * Force garbage collection if available
   */
  forceGarbageCollection(): boolean {
    if (typeof global.gc === 'function') {
      const beforeStats = this.getMemoryStats();
      global.gc();
      const afterStats = this.getMemoryStats();
      
      const freed = beforeStats.used - afterStats.used;
      console.log(`🗑️ Garbage collection freed ${freed}MB of memory`);
      
      this.lastGcTime = Date.now();
      return true;
    } else {
      console.warn('⚠️ Garbage collection not available. Run with --expose-gc flag.');
      return false;
    }
  }

  /**
   * Register cleanup callback
   */
  registerCleanupCallback(callback: () => void): void {
    this.cleanupCallbacks.add(callback);
  }

  /**
   * Unregister cleanup callback
   */
  unregisterCleanupCallback(callback: () => void): void {
    this.cleanupCallbacks.delete(callback);
  }

  /**
   * Run all cleanup callbacks
   */
  runCleanupCallbacks(): void {
    console.log(`🧹 Running ${this.cleanupCallbacks.size} cleanup callbacks...`);
    
    for (const callback of this.cleanupCallbacks) {
      try {
        callback();
      } catch (error) {
        console.error('Cleanup callback error:', error);
      }
    }
  }

  /**
   * Comprehensive memory cleanup
   */
  performMemoryCleanup(): MemoryStats {
    const beforeStats = this.getMemoryStats();
    
    console.log(`🧹 Starting memory cleanup. Current usage: ${beforeStats.used}MB (${beforeStats.percentage.toFixed(1)}%)`);
    
    // Run cleanup callbacks
    this.runCleanupCallbacks();
    
    // Force garbage collection
    this.forceGarbageCollection();
    
    // Clear any cached data
    this.clearCaches();
    
    const afterStats = this.getMemoryStats();
    const freed = beforeStats.used - afterStats.used;
    
    console.log(`✅ Memory cleanup completed. Freed ${freed}MB. New usage: ${afterStats.used}MB (${afterStats.percentage.toFixed(1)}%)`);
    
    return afterStats;
  }

  /**
   * Start memory monitoring
   */
  private startMonitoring(): void {
    this.monitoringInterval = setInterval(() => {
      const stats = this.getMemoryStats();
      
      // Log memory usage if high
      if (stats.percentage > 70) {
        console.warn(`⚠️ High memory usage: ${stats.used}MB (${stats.percentage.toFixed(1)}%)`);
      }
      
      // Auto-cleanup if threshold exceeded
      if (this.isMemoryHigh()) {
        console.log('🚨 Memory threshold exceeded, performing cleanup...');
        this.performMemoryCleanup();
      }
      
      // Periodic cleanup
      if (Date.now() - this.lastGcTime > this.config.cleanupInterval) {
        this.performMemoryCleanup();
      }
    }, 10000); // Check every 10 seconds
  }

  /**
   * Stop memory monitoring
   */
  stopMonitoring(): void {
    if (this.monitoringInterval) {
      clearInterval(this.monitoringInterval);
      this.monitoringInterval = null;
    }
  }

  /**
   * Clear various caches
   */
  private clearCaches(): void {
    // Clear require cache for non-essential modules
    if (typeof require !== 'undefined' && require.cache) {
      const cacheKeys = Object.keys(require.cache);
      for (const key of cacheKeys) {
        // Don't clear essential modules
        if (!key.includes('node_modules') && !key.includes('next')) {
          delete require.cache[key];
        }
      }
    }
  }

  /**
   * Get memory recommendations
   */
  getMemoryRecommendations(): string[] {
    const stats = this.getMemoryStats();
    const recommendations: string[] = [];
    
    if (stats.percentage > 90) {
      recommendations.push('CRITICAL: Memory usage is extremely high. Consider reducing batch sizes or implementing more aggressive cleanup.');
    } else if (stats.percentage > 80) {
      recommendations.push('WARNING: Memory usage is high. Consider implementing memory cleanup strategies.');
    }
    
    if (stats.used > this.config.maxMemoryUsage) {
      recommendations.push(`Memory usage (${stats.used}MB) exceeds configured limit (${this.config.maxMemoryUsage}MB).`);
    }
    
    if (this.cleanupCallbacks.size === 0) {
      recommendations.push('Consider registering cleanup callbacks for better memory management.');
    }
    
    return recommendations;
  }

  /**
   * Destroy memory manager
   */
  destroy(): void {
    this.stopMonitoring();
    this.cleanupCallbacks.clear();
  }
}

// ================================
// MEMORY OPTIMIZATION UTILITIES
// ================================

export class MemoryOptimizer {
  private static instance: MemoryOptimizer;
  private memoryManager: MemoryManager;

  private constructor() {
    this.memoryManager = new MemoryManager({
      maxMemoryUsage: 512,
      gcThreshold: 0.8,
      cleanupInterval: 30000,
      enableMonitoring: true
    });
  }

  public static getInstance(): MemoryOptimizer {
    if (!MemoryOptimizer.instance) {
      MemoryOptimizer.instance = new MemoryOptimizer();
    }
    return MemoryOptimizer.instance;
  }

  /**
   * Optimize array processing to reduce memory usage
   */
  processArrayInBatches<T, R>(
    array: T[],
    processor: (batch: T[]) => R[],
    batchSize: number = 100
  ): R[] {
    const results: R[] = [];
    
    for (let i = 0; i < array.length; i += batchSize) {
      const batch = array.slice(i, i + batchSize);
      const batchResults = processor(batch);
      results.push(...batchResults);
      
      // Check memory usage after each batch
      if (this.memoryManager.isMemoryHigh()) {
        console.log('Memory usage high, performing cleanup...');
        this.memoryManager.performMemoryCleanup();
      }
    }
    
    return results;
  }

  /**
   * Stream processing for large datasets
   */
  async processStream<T, R>(
    items: T[],
    processor: (item: T) => Promise<R>,
    concurrency: number = 5
  ): Promise<R[]> {
    const results: R[] = [];
    const chunks = this.chunkArray(items, concurrency);
    
    for (const chunk of chunks) {
      const chunkResults = await Promise.all(
        chunk.map(item => processor(item))
      );
      results.push(...chunkResults);
      
      // Memory cleanup after each chunk
      if (this.memoryManager.isMemoryHigh()) {
        this.memoryManager.performMemoryCleanup();
      }
    }
    
    return results;
  }

  /**
   * Memory-efficient object processing
   */
  processObjectsEfficiently<T extends Record<string, any>>(
    objects: T[],
    transformer: (obj: T) => Partial<T>
  ): Partial<T>[] {
    const results: Partial<T>[] = [];
    
    for (const obj of objects) {
      // Process one object at a time to minimize memory usage
      const transformed = transformer(obj);
      results.push(transformed);
      
      // Clear references to help GC
      delete (obj as any).__processed;
    }
    
    return results;
  }

  /**
   * Utility function to chunk arrays
   */
  private chunkArray<T>(array: T[], size: number): T[][] {
    const chunks: T[][] = [];
    for (let i = 0; i < array.length; i += size) {
      chunks.push(array.slice(i, i + size));
    }
    return chunks;
  }

  /**
   * Get memory manager instance
   */
  getMemoryManager(): MemoryManager {
    return this.memoryManager;
  }
}

// ================================
// CONVENIENCE FUNCTIONS
// ================================

export const memoryOptimizer = MemoryOptimizer.getInstance();

export function getMemoryStats(): MemoryStats {
  return memoryOptimizer.getMemoryManager().getMemoryStats();
}

export function performMemoryCleanup(): MemoryStats {
  return memoryOptimizer.getMemoryManager().performMemoryCleanup();
}

export function isMemoryHigh(): boolean {
  return memoryOptimizer.getMemoryManager().isMemoryHigh();
}

export function registerCleanupCallback(callback: () => void): void {
  memoryOptimizer.getMemoryManager().registerCleanupCallback(callback);
}

// ================================
// MEMORY MONITORING MIDDLEWARE
// ================================

export function withMemoryMonitoring<T extends any[], R>(
  fn: (...args: T) => R,
  options: {
    logMemory?: boolean;
    cleanupThreshold?: number;
  } = {}
) {
  return (...args: T): R => {
    const beforeStats = getMemoryStats();
    
    if (options.logMemory) {
      console.log(`📊 Memory before: ${beforeStats.used}MB (${beforeStats.percentage.toFixed(1)}%)`);
    }
    
    const result = fn(...args);
    
    const afterStats = getMemoryStats();
    
    if (options.logMemory) {
      console.log(`📊 Memory after: ${afterStats.used}MB (${afterStats.percentage.toFixed(1)}%)`);
    }
    
    // Auto-cleanup if threshold exceeded
    if (options.cleanupThreshold && afterStats.percentage > options.cleanupThreshold) {
      console.log('🧹 Auto-cleanup triggered by memory threshold');
      performMemoryCleanup();
    }
    
    return result;
  };
}
