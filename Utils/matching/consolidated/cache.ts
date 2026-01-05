/**
 * LRU Cache implementation for match results
 */

import type { JobMatch } from "../types";
import { CACHE_TTL_HOURS, MAX_CACHE_SIZE } from "./config";
import type { CacheEntry } from "./types";

export class LRUMatchCache {
  private cache = new Map<string, CacheEntry>();
  private accessOrder: string[] = [];
  private readonly maxSize: number;
  private readonly ttlMs: number;
  private readonly lock = new Map<string, Promise<void>>(); // Simple mutex for cache operations

  constructor(
    maxSize: number = MAX_CACHE_SIZE,
    ttlMs: number = CACHE_TTL_HOURS * 60 * 60 * 1000,
  ) {
    this.maxSize = maxSize;
    this.ttlMs = ttlMs;
  }

  async get(key: string): Promise<JobMatch[] | null> {
    // Wait for any pending operation on this key
    if (this.lock.has(key)) {
      await this.lock.get(key);
    }

    const entry = this.cache.get(key);

    if (!entry) return null;

    // Check TTL
    if (Date.now() - entry.timestamp > this.ttlMs) {
      this.cache.delete(key);
      this.removeFromAccessOrder(key);
      return null;
    }

    // Update access tracking
    entry.accessCount++;
    entry.lastAccessed = Date.now();

    // Move to end of access order
    this.removeFromAccessOrder(key);
    this.accessOrder.push(key);

    return entry.matches;
  }

  async set(key: string, matches: JobMatch[]): Promise<void> {
    // Create a lock for this key to prevent race conditions
    const lockPromise = this.acquireLock(key);
    this.lock.set(key, lockPromise);

    try {
      // Remove oldest entries if at capacity
      while (this.cache.size >= this.maxSize) {
        const oldestKey = this.accessOrder.shift();
        if (oldestKey) {
          this.cache.delete(oldestKey);
        }
      }

      const entry: CacheEntry = {
        matches,
        timestamp: Date.now(),
        accessCount: 1,
        lastAccessed: Date.now(),
      };

      this.cache.set(key, entry);
      this.accessOrder.push(key);
    } finally {
      this.lock.delete(key);
    }
  }

  private async acquireLock(key: string): Promise<void> {
    // Simple mutex implementation
    return new Promise((resolve) => {
      const checkLock = () => {
        if (!this.lock.has(key)) {
          resolve();
        } else {
          setTimeout(checkLock, 1);
        }
      };
      checkLock();
    });
  }

  private removeFromAccessOrder(key: string): void {
    const index = this.accessOrder.indexOf(key);
    if (index > -1) {
      this.accessOrder.splice(index, 1);
    }
  }

  getStats() {
    return {
      size: this.cache.size,
      maxSize: this.maxSize,
      hitRate: 0, // Would need to track hits/misses for accurate calculation
    };
  }

  clear(): void {
    this.cache.clear();
    this.accessOrder = [];
  }
}

// SHARED CACHE: Use LRU implementation
export const SHARED_MATCH_CACHE = new LRUMatchCache();
