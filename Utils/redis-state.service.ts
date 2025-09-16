/**
 * Redis-based state management service
 * Replaces in-memory Maps/Sets that don't scale across instances
 */

import Redis from 'ioredis';

export class RedisStateService {
  private redis: Redis | null = null;
  private isConnected = false;

  constructor() {
    this.initializeRedis();
  }

  private async initializeRedis() {
    try {
      if (process.env.REDIS_URL) {
        this.redis = new Redis(process.env.REDIS_URL, {
          maxRetriesPerRequest: 3,
          lazyConnect: true
        });

        this.redis.on('connect', () => {
          console.log('✅ Redis connected');
          this.isConnected = true;
        });

        this.redis.on('error', (err) => {
          console.warn('⚠️ Redis connection error:', err.message);
          this.isConnected = false;
        });

        await this.redis.connect();
      } else {
        console.warn('⚠️ REDIS_URL not set, using fallback in-memory state');
      }
    } catch (error) {
      console.warn('⚠️ Redis initialization failed:', error);
      this.isConnected = false;
    }
  }

  // ---------- Seen Jobs Management ----------
  async markJobAsSeen(jobId: number, ttlHours: number = 72): Promise<void> {
    if (!this.isConnected || !this.redis) return;
    
    try {
      const key = `seen:job:${jobId}`;
      await this.redis.setex(key, ttlHours * 3600, Date.now().toString());
    } catch (error) {
      console.warn('Failed to mark job as seen:', error);
    }
  }

  async isJobSeen(jobId: number): Promise<boolean> {
    if (!this.isConnected || !this.redis) return false;
    
    try {
      const key = `seen:job:${jobId}`;
      const result = await this.redis.exists(key);
      return result === 1;
    } catch (error) {
      console.warn('Failed to check if job is seen:', error);
      return false;
    }
  }

  async getSeenJobsCount(): Promise<number> {
    if (!this.isConnected || !this.redis) return 0;
    
    try {
      const keys = await this.redis.keys('seen:job:*');
      return keys.length;
    } catch (error) {
      console.warn('Failed to get seen jobs count:', error);
      return 0;
    }
  }

  // ---------- Company Cache Management ----------
  async setCompanyCache(company: string, data: { lastCheck: number; jobCount: number }, ttlHours: number = 24): Promise<void> {
    if (!this.isConnected || !this.redis) return;
    
    try {
      const key = `cache:company:${company}`;
      await this.redis.setex(key, ttlHours * 3600, JSON.stringify(data));
    } catch (error) {
      console.warn('Failed to set company cache:', error);
    }
  }

  async getCompanyCache(company: string): Promise<{ lastCheck: number; jobCount: number } | null> {
    if (!this.isConnected || !this.redis) return null;
    
    try {
      const key = `cache:company:${company}`;
      const result = await this.redis.get(key);
      return result ? JSON.parse(result) : null;
    } catch (error) {
      console.warn('Failed to get company cache:', error);
      return null;
    }
  }

  // ---------- Rate Limiting ----------
  async checkRateLimit(key: string, limit: number, windowSeconds: number): Promise<{ allowed: boolean; remaining: number; resetTime: number }> {
    if (!this.isConnected || !this.redis) {
      return { allowed: true, remaining: limit, resetTime: Date.now() + windowSeconds * 1000 };
    }
    
    try {
      const redisKey = `rate_limit:${key}`;
      const current = await this.redis.incr(redisKey);
      
      if (current === 1) {
        await this.redis.expire(redisKey, windowSeconds);
      }
      
      const ttl = await this.redis.ttl(redisKey);
      const resetTime = Date.now() + (ttl * 1000);
      
      return {
        allowed: current <= limit,
        remaining: Math.max(0, limit - current),
        resetTime
      };
    } catch (error) {
      console.warn('Failed to check rate limit:', error);
      return { allowed: true, remaining: limit, resetTime: Date.now() + windowSeconds * 1000 };
    }
  }

  // ---------- Scraping Session State ----------
  async startScrapingSession(sessionId: string, metadata: any): Promise<void> {
    if (!this.isConnected || !this.redis) return;
    
    try {
      const key = `session:${sessionId}`;
      const data = {
        ...metadata,
        startedAt: Date.now(),
        status: 'running'
      };
      await this.redis.setex(key, 3600, JSON.stringify(data)); // 1 hour TTL
    } catch (error) {
      console.warn('Failed to start scraping session:', error);
    }
  }

  async updateScrapingSession(sessionId: string, updates: any): Promise<void> {
    if (!this.isConnected || !this.redis) return;
    
    try {
      const key = `session:${sessionId}`;
      const existing = await this.redis.get(key);
      if (existing) {
        const data = JSON.parse(existing);
        const updated = { ...data, ...updates, updatedAt: Date.now() };
        await this.redis.setex(key, 3600, JSON.stringify(updated));
      }
    } catch (error) {
      console.warn('Failed to update scraping session:', error);
    }
  }

  async endScrapingSession(sessionId: string, finalStats: any): Promise<void> {
    if (!this.isConnected || !this.redis) return;
    
    try {
      const key = `session:${sessionId}`;
      const existing = await this.redis.get(key);
      if (existing) {
        const data = JSON.parse(existing);
        const final = { 
          ...data, 
          ...finalStats, 
          endedAt: Date.now(),
          status: 'completed'
        };
        await this.redis.setex(key, 86400, JSON.stringify(final)); // 24 hours TTL
      }
    } catch (error) {
      console.warn('Failed to end scraping session:', error);
    }
  }

  // ---------- Health Check ----------
  async isHealthy(): Promise<boolean> {
    if (!this.redis) return false;
    
    try {
      await this.redis.ping();
      return true;
    } catch (error) {
      return false;
    }
  }

  // ---------- Cleanup ----------
  async cleanup(): Promise<void> {
    if (this.redis) {
      try {
        await this.redis.quit();
      } catch (error) {
        console.warn('Error closing Redis connection:', error);
      }
    }
  }
}

// Singleton instance
export const redisState = new RedisStateService();
