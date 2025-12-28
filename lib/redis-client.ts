/**
 * Redis Client Manager
 * 
 * Centralized Redis client for use across the application.
 * Handles connection pooling, reconnection, and graceful degradation.
 * 
 * Optimized for Vercel serverless functions:
 * - Connection reuse across invocations in the same container
 * - Automatic reconnection on failure
 * - Graceful fallback when Redis is unavailable
 */

import { createClient, RedisClientType } from 'redis';
import { ENV } from './env';
import { logger } from './monitoring';

class RedisClientManager {
  private static instance: RedisClientType | null = null;
  private static isInitializing = false;
  private static isConnected = false;
  private static connectionPromise: Promise<void> | null = null;

  private constructor() {
    // Private constructor to enforce singleton
  }

  /**
   * Get or create Redis client instance
   * Returns null if Redis is not configured
   */
  static async getClient(): Promise<RedisClientType | null> {
    // If Redis URL is not configured, return null
    if (!ENV.REDIS_URL) {
      return null;
    }

    // If we already have a connected instance, return it
    if (this.instance && this.isConnected) {
      return this.instance;
    }

    // If we're currently initializing, wait for that to complete
    if (this.isInitializing && this.connectionPromise) {
      await this.connectionPromise;
      return this.instance;
    }

    // Initialize new connection
    if (!this.instance) {
      this.isInitializing = true;
      
      this.connectionPromise = this.initializeClient();
      
      try {
        await this.connectionPromise;
      } catch (error) {
        logger.error('Failed to initialize Redis client', {
          error: error as Error,
          component: 'redis-client',
        });
        this.isConnected = false;
      } finally {
        this.isInitializing = false;
        this.connectionPromise = null;
      }
    }

    return this.instance;
  }

  /**
   * Initialize Redis client with proper configuration
   */
  private static async initializeClient(): Promise<void> {
    if (!ENV.REDIS_URL) {
      throw new Error('REDIS_URL is not configured');
    }

    try {
      this.instance = createClient({
        url: ENV.REDIS_URL,
        socket: {
          connectTimeout: 5000,
          reconnectStrategy: (retries) => {
            if (retries > 10) {
              logger.error('Redis reconnection failed after 10 retries', {
                component: 'redis-client',
              });
              return new Error('Redis reconnection limit exceeded');
            }
            // Exponential backoff: 50ms, 100ms, 200ms, 400ms, etc., max 3s
            const delay = Math.min(50 * Math.pow(2, retries), 3000);
            return delay;
          },
        },
      });

      // Set up error handlers
      this.instance.on('error', (err) => {
        logger.error('Redis client error', {
          error: err,
          component: 'redis-client',
        });
        this.isConnected = false;
      });

      this.instance.on('connect', () => {
        logger.info('Redis client connected', {
          component: 'redis-client',
        });
        this.isConnected = true;
      });

      this.instance.on('ready', () => {
        logger.info('Redis client ready', {
          component: 'redis-client',
        });
        this.isConnected = true;
      });

      this.instance.on('reconnecting', () => {
        logger.info('Redis client reconnecting', {
          component: 'redis-client',
        });
        this.isConnected = false;
      });

      this.instance.on('end', () => {
        logger.info('Redis client connection ended', {
          component: 'redis-client',
        });
        this.isConnected = false;
      });

      // Connect to Redis
      await this.instance.connect();
      this.isConnected = true;

      logger.info('Redis client initialized successfully', {
        component: 'redis-client',
      });
    } catch (error) {
      logger.error('Failed to initialize Redis client', {
        error: error as Error,
        component: 'redis-client',
      });
      this.instance = null;
      this.isConnected = false;
      throw error;
    }
  }

  /**
   * Check if Redis is available and connected
   */
  static async isAvailable(): Promise<boolean> {
    try {
      const client = await this.getClient();
      if (!client) {
        return false;
      }

      // Ping Redis to verify connection
      await client.ping();
      return true;
    } catch (error) {
      logger.warn('Redis availability check failed', {
        error: error as Error,
        component: 'redis-client',
      });
      return false;
    }
  }

  /**
   * Close Redis connection gracefully
   */
  static async close(): Promise<void> {
    if (this.instance) {
      try {
        await this.instance.quit();
        logger.info('Redis client closed', {
          component: 'redis-client',
        });
      } catch (error) {
        logger.error('Error closing Redis client', {
          error: error as Error,
          component: 'redis-client',
        });
      } finally {
        this.instance = null;
        this.isConnected = false;
      }
    }
  }

  /**
   * Get connection status
   */
  static getStatus(): {
    isConfigured: boolean;
    isConnected: boolean;
    isInitialized: boolean;
  } {
    return {
      isConfigured: !!ENV.REDIS_URL,
      isConnected: this.isConnected,
      isInitialized: !!this.instance,
    };
  }
}

/**
 * Get Redis client instance
 * Returns null if Redis is not configured or unavailable
 */
export async function getRedisClient(): Promise<RedisClientType | null> {
  return RedisClientManager.getClient();
}

/**
 * Check if Redis is available
 */
export async function isRedisAvailable(): Promise<boolean> {
  return RedisClientManager.isAvailable();
}

/**
 * Close Redis connection (for cleanup/testing)
 */
export async function closeRedisClient(): Promise<void> {
  return RedisClientManager.close();
}

/**
 * Get Redis connection status
 */
export function getRedisStatus() {
  return RedisClientManager.getStatus();
}

/**
 * Execute a Redis operation with automatic error handling
 * Returns null if Redis is unavailable, otherwise returns the result
 */
export async function withRedis<T>(
  operation: (client: RedisClientType) => Promise<T>,
  fallback: T | (() => T) | null = null
): Promise<T | null> {
  try {
    const client = await getRedisClient();
    if (!client) {
      if (fallback === null) {
        return null;
      }
      return typeof fallback === 'function' ? (fallback as () => T)() : fallback;
    }

    return await operation(client);
  } catch (error) {
    logger.error('Redis operation failed', {
      error: error as Error,
      component: 'redis-client',
    });
    
    if (fallback === null) {
      return null;
    }
    return typeof fallback === 'function' ? (fallback as () => T)() : fallback;
  }
}

// Graceful shutdown handling
process.on('SIGTERM', async () => {
  await closeRedisClient();
});

process.on('SIGINT', async () => {
  await closeRedisClient();
});

