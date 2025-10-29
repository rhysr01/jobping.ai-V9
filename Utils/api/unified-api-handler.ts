/**
 * UNIFIED API HANDLER
 * Integrates with existing asyncHandler + ErrorHandler patterns
 * Adds rate limiting and validation on top of current architecture
 */

import { NextRequest, NextResponse } from 'next/server';
import { ZodSchema, ZodError } from 'zod';
import { asyncHandler, AppError, ValidationError, UnauthorizedError, RateLimitError } from '@/lib/errors';

// ============================================
// RATE LIMITING (Lightweight)
// ============================================

interface RateLimitConfig {
  windowMs: number;
  maxRequests: number;
  keyGenerator?: (req: NextRequest) => string;
}

interface RateLimitEntry {
  count: number;
  resetTime: number;
}

class SimpleRateLimiter {
  private store = new Map<string, RateLimitEntry>();
  private cleanupInterval: NodeJS.Timeout;

  constructor() {
    // Cleanup every 5 minutes
    this.cleanupInterval = setInterval(() => this.cleanup(), 5 * 60 * 1000);
  }

  isAllowed(key: string, config: RateLimitConfig): { allowed: boolean; remaining: number; resetTime: number } {
    const now = Date.now();
    const entry = this.store.get(key);

    if (!entry || now > entry.resetTime) {
      this.store.set(key, { count: 1, resetTime: now + config.windowMs });
      return { allowed: true, remaining: config.maxRequests - 1, resetTime: now + config.windowMs };
    }

    if (entry.count >= config.maxRequests) {
      return { allowed: false, remaining: 0, resetTime: entry.resetTime };
    }

    entry.count++;
    return { allowed: true, remaining: config.maxRequests - entry.count, resetTime: entry.resetTime };
  }

  private cleanup(): void {
    const now = Date.now();
    for (const [key, entry] of this.store.entries()) {
      if (now > entry.resetTime) {
        this.store.delete(key);
      }
    }
  }

  destroy(): void {
    clearInterval(this.cleanupInterval);
    this.store.clear();
  }
}

// ============================================
// UNIFIED API HANDLER
// ============================================

let rateLimiter: SimpleRateLimiter | null = null;

function getRateLimiter(): SimpleRateLimiter {
  if (!rateLimiter) {
    rateLimiter = new SimpleRateLimiter();
  }
  return rateLimiter;
}

interface HandlerOptions {
  rateLimit?: RateLimitConfig;
  validation?: {
    body?: ZodSchema;
    query?: ZodSchema;
  };
  requireAuth?: boolean;
  allowedMethods?: string[];
}

export function createUnifiedHandler<T>(
  handler: (req: NextRequest) => Promise<NextResponse<T>>,
  options: HandlerOptions = {}
) {
  return asyncHandler(async (request: NextRequest) => {
      // Method validation
      if (options.allowedMethods && !options.allowedMethods.includes(request.method)) {
        throw new AppError('Method not allowed', 405, 'METHOD_NOT_ALLOWED');
      }

    // Rate limiting
    if (options.rateLimit) {
      const key = options.rateLimit.keyGenerator ? 
        options.rateLimit.keyGenerator(request) : 
        request.headers.get('x-forwarded-for') || 'unknown';
      
      const rateLimitResult = getRateLimiter().isAllowed(key, options.rateLimit);
      if (!rateLimitResult.allowed) {
        throw new RateLimitError(rateLimitResult.resetTime);
      }
    }

    // Authentication check (simplified)
    if (options.requireAuth) {
      // Normalize header lookup to be resilient in test/runtime envs
      let authHeader = request.headers.get('authorization');
      if (!authHeader) {
        for (const [key, value] of request.headers.entries()) {
          if (key.toLowerCase() === 'authorization') {
            authHeader = value;
            break;
          }
        }
      }

      if (!authHeader || !authHeader.startsWith('Bearer ')) {
        throw new UnauthorizedError('Authentication required');
      }
    }

    // Input validation
    if (options.validation) {
      await validateInput(request, options.validation);
    }

    // Execute handler
    return handler(request);
  });
}

async function validateInput(request: NextRequest, validation: { body?: ZodSchema; query?: ZodSchema }): Promise<void> {
  // Validate query parameters
  if (validation.query) {
    const url = new URL(request.url);
    const queryParams = Object.fromEntries(url.searchParams.entries());
    
    try {
      validation.query.parse(queryParams);
    } catch (error) {
      if (error instanceof ZodError) {
        throw new ValidationError('Invalid query parameters', error.issues as any);
      }
      throw error;
    }
  }

  // Validate request body
  if (validation.body && request.method !== 'GET') {
    try {
      const body = await request.json();
      validation.body.parse(body);
    } catch (error) {
      if (error instanceof ZodError) {
        throw new ValidationError('Invalid request body', error.issues as any);
      }
      throw error;
    }
  }
}

// ============================================
// CONVENIENCE FUNCTIONS
// ============================================

export function createRateLimitedHandler<T>(
  handler: (req: NextRequest) => Promise<NextResponse<T>>,
  rateLimit: RateLimitConfig,
  options?: Omit<HandlerOptions, 'rateLimit'>
) {
  return createUnifiedHandler(handler, { ...options, rateLimit });
}

export function createValidatedHandler<T>(
  handler: (req: NextRequest) => Promise<NextResponse<T>>,
  validation: HandlerOptions['validation'],
  options?: Omit<HandlerOptions, 'validation'>
) {
  return createUnifiedHandler(handler, { ...options, validation });
}

export function createAuthenticatedHandler<T>(
  handler: (req: NextRequest) => Promise<NextResponse<T>>,
  options?: Omit<HandlerOptions, 'requireAuth'>
) {
  return createUnifiedHandler(handler, { ...options, requireAuth: true });
}

// ============================================
// COMMON RATE LIMIT CONFIGS
// ============================================

export const RATE_LIMITS = {
  GENERAL: { windowMs: 15 * 60 * 1000, maxRequests: 100 },
  AUTH: { windowMs: 15 * 60 * 1000, maxRequests: 10 },
  MATCHING: { windowMs: 60 * 1000, maxRequests: 5 },
  EMAIL: { windowMs: 60 * 1000, maxRequests: 3 },
  ADMIN: { windowMs: 60 * 1000, maxRequests: 20 }
} as const;

// ============================================
// CLEANUP
// ============================================

// Cleanup on process exit
if (typeof process !== 'undefined') {
  process.on('SIGINT', () => rateLimiter?.destroy());
  process.on('SIGTERM', () => rateLimiter?.destroy());
}
