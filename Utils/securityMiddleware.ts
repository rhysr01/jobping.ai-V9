// ================================
// ENHANCED AUTHENTICATION MIDDLEWARE
// ================================

import { NextRequest, NextResponse } from 'next/server';
import { APIKeyManager, APIKeyUsageTracker } from './apiKeyManager';
import { rateLimiter } from './rateLimiter';
import { simpleRateLimiter } from './simpleRateLimiter';

/**
 * Enhanced security middleware with comprehensive protection
 */
export class SecurityMiddleware {
  private apiKeyManager: APIKeyManager;
  private rateLimiter: typeof rateLimiter;
  private usageTracker: APIKeyUsageTracker;

  constructor() {
    this.apiKeyManager = new APIKeyManager();
    this.rateLimiter = rateLimiter;
    this.usageTracker = new APIKeyUsageTracker();
  }

  /**
   * Main authentication middleware
   */
  async authenticate(req: NextRequest): Promise<{ 
    success: boolean; 
    userData?: any; 
    rateLimit?: any; 
    error?: string; 
    status?: number;
  }> {
    try {
      // Check for test mode
      const isTestMode = process.env.NODE_ENV === 'test' || process.env.JOBPING_TEST_MODE === '1';
      
      // Extract API key
      const apiKey = this.extractAPIKey(req);
      
      // Allow test API key ONLY in test/development mode
      if (apiKey === 'test-api-key' && isTestMode) {
        return {
          success: true,
          userData: { userId: 'test-user', tier: 'free' },
          rateLimit: { allowed: true, remaining: 100 }
        };
      }
      
      // REJECT test API key in production
      if (apiKey === 'test-api-key' && !isTestMode) {
        console.error('🚨 SECURITY ALERT: Test API key attempted in production mode');
        return {
          success: false,
          error: 'Test API key not allowed in production',
          status: 401
        };
      }
      
      if (!apiKey) {
        return { 
          success: false, 
          error: 'API key required',
          status: 401
        };
      }

      // Extract IP address
      const ip = this.extractIP(req);

      // Validate API key
      const validation = await this.apiKeyManager.validateAPIKey(apiKey);
      if (!validation.valid) {
        await this.usageTracker.trackUsage(apiKey, req.nextUrl?.pathname || 'unknown', ip, false);
        return { 
          success: false, 
          error: validation.error || 'Invalid API key',
          status: 401
        };
      }

      // Check rate limits
      const endpointCategory = this.getEndpointCategory(req.nextUrl?.pathname || '');
      const rateLimitResult = await this.rateLimiter.checkLimit(apiKey, 100, 60000); // 100 requests per minute

      if (!rateLimitResult.allowed) {
        await this.usageTracker.trackUsage(apiKey, req.nextUrl?.pathname || 'unknown', ip, false);
        return { 
          success: false, 
          error: 'Rate limit exceeded',
          status: 429,
          rateLimit: rateLimitResult
        };
      }

      // Track successful usage
      await this.usageTracker.trackUsage(apiKey, req.nextUrl?.pathname || 'unknown', ip, true);

      return {
        success: true,
        userData: validation.userData,
        rateLimit: rateLimitResult
      };
    } catch (error) {
      console.error('Authentication error:', error);
      return { 
        success: false, 
        error: 'Authentication failed',
        status: 500
      };
    }
  }

  /**
   * Extract API key from request
   */
  private extractAPIKey(req: NextRequest): string | null {
    // Check multiple sources for API key
    const sources = [
      req.headers.get('x-api-key'),
      req.headers.get('authorization')?.replace('Bearer ', ''),
      req.nextUrl?.searchParams.get('api_key')
    ];

    for (const source of sources) {
      if (source && source.trim()) {
        return source.trim();
      }
    }

    return null;
  }

  /**
   * Extract IP address from request
   */
  private extractIP(req: NextRequest): string {
    const ipSources = [
      req.headers.get('x-forwarded-for')?.split(',')[0],
      req.headers.get('x-real-ip'),
      req.headers.get('x-client-ip'),
      req.headers.get('cf-connecting-ip'), // Cloudflare
      req.headers.get('x-forwarded'),
      req.headers.get('forwarded-for'),
      req.headers.get('forwarded')
    ];

    for (const ip of ipSources) {
      if (ip && ip.trim() && ip !== 'unknown') {
        return ip.trim();
      }
    }

    return 'unknown-ip';
  }

  /**
   * Get endpoint category for rate limiting
   */
  private getEndpointCategory(path: string): string {
    if (path.includes('/scrape')) return 'scraping';
    if (path.includes('/match')) return 'matching';
    if (path.includes('/webhook')) return 'webhook';
    if (path.includes('/cleanup')) return 'cleanup';
    return 'general';
  }

  /**
   * Create error response
   */
  createErrorResponse(error: string, status: number = 400, additionalData?: any): NextResponse {
    const response: any = { error };
    
    if (additionalData) {
      Object.assign(response, additionalData);
    }

    return NextResponse.json(response, { status });
  }

  /**
   * Create success response with rate limit headers
   */
  createSuccessResponse(data: any, rateLimit?: any): NextResponse {
    const response = NextResponse.json(data);
    
    if (rateLimit && rateLimit.remaining !== undefined && rateLimit.resetTime !== undefined) {
      response.headers.set('X-RateLimit-Remaining', rateLimit.remaining.toString());
      response.headers.set('X-RateLimit-Reset', rateLimit.resetTime.toString());
      response.headers.set('X-RateLimit-Limit', '100'); // Example limit
    }

    return response;
  }
}

/**
 * Middleware factory for easy integration
 */
export function createSecurityMiddleware() {
  const middleware = new SecurityMiddleware();
  
  return async (req: NextRequest): Promise<NextResponse | null> => {
    const authResult = await middleware.authenticate(req);
    
    if (!authResult.success) {
      return middleware.createErrorResponse(
        authResult.error || 'Authentication failed',
        authResult.status || 401,
        authResult.rateLimit ? { retryAfter: authResult.rateLimit.retryAfter } : undefined
      );
    }

    // Add user data and rate limit info to request headers for downstream use
    const requestHeaders = new Headers(req.headers);
    if (authResult.userData) {
      requestHeaders.set('x-user-data', JSON.stringify(authResult.userData));
    }
    if (authResult.rateLimit) {
      requestHeaders.set('x-rate-limit', JSON.stringify(authResult.rateLimit));
    }

    // Clone the request with new headers
    const modifiedReq = new NextRequest(req, {
      headers: requestHeaders
    });

    // Continue with the request (this would be handled by the actual route)
    return null;
  };
}

/**
 * Utility function to extract user data from request headers
 */
export function extractUserData(req: NextRequest): any {
  const userDataHeader = req.headers.get('x-user-data');
  if (userDataHeader) {
    try {
      return JSON.parse(userDataHeader);
    } catch (error) {
      console.error('Failed to parse user data:', error);
      return null;
    }
  }
  return null;
}

/**
 * Utility function to extract rate limit info from request headers
 */
export function extractRateLimit(req: NextRequest): any {
  const rateLimitHeader = req.headers.get('x-rate-limit');
  if (rateLimitHeader) {
    try {
      return JSON.parse(rateLimitHeader);
    } catch (error) {
      console.error('Failed to parse rate limit:', error);
      return null;
    }
  }
  return null;
}

/**
 * Security headers middleware
 */
export function addSecurityHeaders(response: NextResponse): NextResponse {
  // Security headers
  response.headers.set('X-Content-Type-Options', 'nosniff');
  response.headers.set('X-Frame-Options', 'DENY');
  response.headers.set('X-XSS-Protection', '1; mode=block');
  response.headers.set('Referrer-Policy', 'strict-origin-when-cross-origin');
  response.headers.set('Permissions-Policy', 'camera=(), microphone=(), geolocation=()');
  
  // CORS headers (if needed)
  response.headers.set('Access-Control-Allow-Origin', '*');
  response.headers.set('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
  response.headers.set('Access-Control-Allow-Headers', 'Content-Type, Authorization, X-API-Key');
  
  return response;
}
