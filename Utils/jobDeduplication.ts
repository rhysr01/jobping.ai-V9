/**
 * Simple Job Deduplication Cache
 * 
 * Quick win: Prevent duplicate jobs from being processed multiple times
 * Uses in-memory cache with TTL for simplicity
 */

interface CachedJob {
  hash: string;
  timestamp: number;
  processed: boolean;
}

class JobDeduplicationCache {
  private cache = new Map<string, CachedJob>();
  private readonly TTL = 24 * 60 * 60 * 1000; // 24 hours
  private readonly CLEANUP_INTERVAL = 60 * 60 * 1000; // 1 hour

  constructor() {
    // Cleanup old entries every hour
    setInterval(() => this.cleanup(), this.CLEANUP_INTERVAL);
  }

  /**
   * Generate a simple hash for job deduplication
   */
  private generateJobHash(job: {
    title: string;
    company: string;
    location: string;
    source: string;
  }): string {
    const normalized = {
      title: job.title.toLowerCase().trim(),
      company: job.company.toLowerCase().trim(),
      location: job.location.toLowerCase().trim(),
      source: job.source.toLowerCase().trim()
    };
    
    return `${normalized.source}:${normalized.company}:${normalized.title}:${normalized.location}`;
  }

  /**
   * Check if job has already been processed
   */
  isDuplicate(job: {
    title: string;
    company: string;
    location: string;
    source: string;
  }): boolean {
    const hash = this.generateJobHash(job);
    const cached = this.cache.get(hash);
    
    if (!cached) {
      return false;
    }
    
    // Check if cache entry is still valid
    if (Date.now() - cached.timestamp > this.TTL) {
      this.cache.delete(hash);
      return false;
    }
    
    return cached.processed;
  }

  /**
   * Mark job as processed
   */
  markAsProcessed(job: {
    title: string;
    company: string;
    location: string;
    source: string;
  }): void {
    const hash = this.generateJobHash(job);
    this.cache.set(hash, {
      hash,
      timestamp: Date.now(),
      processed: true
    });
  }

  /**
   * Get cache statistics
   */
  getStats(): {
    totalEntries: number;
    processedJobs: number;
    cacheSize: number;
  } {
    const now = Date.now();
    let processedJobs = 0;
    
    for (const [key, entry] of this.cache.entries()) {
      if (now - entry.timestamp > this.TTL) {
        this.cache.delete(key);
        continue;
      }
      if (entry.processed) {
        processedJobs++;
      }
    }
    
    return {
      totalEntries: this.cache.size,
      processedJobs,
      cacheSize: this.cache.size
    };
  }

  /**
   * Clean up expired entries
   */
  private cleanup(): void {
    const now = Date.now();
    let cleaned = 0;
    
    for (const [key, entry] of this.cache.entries()) {
      if (now - entry.timestamp > this.TTL) {
        this.cache.delete(key);
        cleaned++;
      }
    }
    
    if (cleaned > 0) {
      console.log(`🧹 Job deduplication cache: cleaned ${cleaned} expired entries`);
    }
  }

  /**
   * Clear all cache entries (useful for testing)
   */
  clear(): void {
    this.cache.clear();
  }
}

// Export singleton instance
export const jobDeduplicationCache = new JobDeduplicationCache();

/**
 * Helper function to check and mark job as processed
 */
export function processJobIfNew(job: {
  title: string;
  company: string;
  location: string;
  source: string;
}): boolean {
  if (jobDeduplicationCache.isDuplicate(job)) {
    return false; // Already processed
  }
  
  jobDeduplicationCache.markAsProcessed(job);
  return true; // New job, can be processed
}
