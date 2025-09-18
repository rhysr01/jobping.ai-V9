/**
 * Enhanced Webhook Security Utilities
 * Provides comprehensive security for webhook endpoints
 */

import crypto from 'crypto';
import { NextRequest } from 'next/server';

// ================================
// WEBHOOK SECURITY CONFIGURATION
// ================================

export interface WebhookSecurityConfig {
  secret: string;
  maxAge: number; // Maximum age of webhook in milliseconds
  allowedIps?: string[]; // Optional IP whitelist
  requireTimestamp: boolean;
  requireSignature: boolean;
}

export interface WebhookValidationResult {
  isValid: boolean;
  error?: string;
  timestamp?: number;
  signature?: string;
}

// ================================
// WEBHOOK SECURITY CLASS
// ================================

export class WebhookSecurity {
  private config: WebhookSecurityConfig;

  constructor(config: WebhookSecurityConfig) {
    this.config = config;
  }

  /**
   * Validate webhook request with comprehensive security checks
   */
  async validateWebhook(request: NextRequest): Promise<WebhookValidationResult> {
    try {
      // Skip validation in test mode
      if (process.env.NODE_ENV === 'test' || process.env.JOBPING_TEST_MODE === '1') {
        return { isValid: true };
      }

      // Check IP whitelist if configured
      if (this.config.allowedIps && this.config.allowedIps.length > 0) {
        const clientIp = this.getClientIp(request);
        if (!this.config.allowedIps.includes(clientIp)) {
          return {
            isValid: false,
            error: `IP ${clientIp} not in whitelist`
          };
        }
      }

      // Validate timestamp if required
      if (this.config.requireTimestamp) {
        const timestampResult = this.validateTimestamp(request);
        if (!timestampResult.isValid) {
          return timestampResult;
        }
      }

      // Validate signature if required
      if (this.config.requireSignature) {
        const signatureResult = await this.validateSignature(request);
        if (!signatureResult.isValid) {
          return signatureResult;
        }
      }

      return { isValid: true };

    } catch (error) {
      console.error('Webhook validation error:', error);
      return {
        isValid: false,
        error: 'Internal validation error'
      };
    }
  }

  /**
   * Validate webhook timestamp to prevent replay attacks
   */
  private validateTimestamp(request: NextRequest): WebhookValidationResult {
    const timestampHeader = request.headers.get('x-tally-timestamp') || 
                           request.headers.get('x-stripe-timestamp') ||
                           request.headers.get('x-timestamp');

    if (!timestampHeader) {
      return {
        isValid: false,
        error: 'Missing timestamp header'
      };
    }

    const timestamp = Number(timestampHeader);
    if (!Number.isFinite(timestamp)) {
      return {
        isValid: false,
        error: 'Invalid timestamp format'
      };
    }

    const now = Date.now();
    const age = Math.abs(now - timestamp);

    if (age > this.config.maxAge) {
      return {
        isValid: false,
        error: `Webhook too old: ${age}ms > ${this.config.maxAge}ms`
      };
    }

    return {
      isValid: true,
      timestamp
    };
  }

  /**
   * Validate webhook signature using HMAC
   */
  private async validateSignature(request: NextRequest): Promise<WebhookValidationResult> {
    const signatureHeader = request.headers.get('x-tally-signature') || 
                           request.headers.get('x-stripe-signature') ||
                           request.headers.get('x-signature');

    if (!signatureHeader) {
      return {
        isValid: false,
        error: 'Missing signature header'
      };
    }

    // Get raw body for signature verification
    const rawBody = await this.getRawBody(request);
    if (!rawBody) {
      return {
        isValid: false,
        error: 'Unable to read request body'
      };
    }

    // Extract timestamp from signature (for services like Stripe)
    const timestamp = this.extractTimestampFromSignature(signatureHeader);
    const payload = timestamp ? `${timestamp}.${rawBody}` : rawBody;

    // Compute expected signature
    const expectedSignature = this.computeSignature(payload);
    const providedSignature = this.extractSignature(signatureHeader);

    // Use timing-safe comparison
    if (!this.timingSafeEqual(expectedSignature, providedSignature)) {
      return {
        isValid: false,
        error: 'Invalid signature'
      };
    }

    return {
      isValid: true,
      signature: providedSignature
    };
  }

  /**
   * Compute HMAC signature
   */
  private computeSignature(payload: string): string {
    const hmac = crypto.createHmac('sha256', this.config.secret);
    hmac.update(payload);
    return hmac.digest('hex');
  }

  /**
   * Extract signature from header (removes prefix like 'sha256=')
   */
  private extractSignature(signatureHeader: string): string {
    return signatureHeader.replace(/^sha256=/, '').replace(/^v1=/, '');
  }

  /**
   * Extract timestamp from signature header (for services like Stripe)
   */
  private extractTimestampFromSignature(signatureHeader: string): string | null {
    const match = signatureHeader.match(/^v1=(\d+),/);
    return match ? match[1] : null;
  }

  /**
   * Timing-safe string comparison
   */
  private timingSafeEqual(a: string, b: string): boolean {
    const aBuf = Buffer.from(a, 'hex');
    const bBuf = Buffer.from(b, 'hex');
    
    if (aBuf.length !== bBuf.length) {
      return false;
    }
    
    return crypto.timingSafeEqual(aBuf, bBuf);
  }

  /**
   * Get raw request body
   */
  private async getRawBody(request: NextRequest): Promise<string> {
    try {
      return await request.text();
    } catch (error) {
      console.error('Failed to read request body:', error);
      return '';
    }
  }

  /**
   * Get client IP address
   */
  private getClientIp(request: NextRequest): string {
    const forwarded = request.headers.get('x-forwarded-for');
    const realIp = request.headers.get('x-real-ip');
    const cfConnectingIp = request.headers.get('cf-connecting-ip');
    
    if (cfConnectingIp) return cfConnectingIp;
    if (realIp) return realIp;
    if (forwarded) return forwarded.split(',')[0].trim();
    
    return 'unknown';
  }
}

// ================================
// PREDEFINED SECURITY CONFIGS
// ================================

export const TALLY_WEBHOOK_SECURITY = new WebhookSecurity({
  secret: process.env.TALLY_WEBHOOK_SECRET || '',
  maxAge: 5 * 60 * 1000, // 5 minutes
  requireTimestamp: true,
  requireSignature: true,
  allowedIps: process.env.TALLY_ALLOWED_IPS?.split(',') || []
});

export const STRIPE_WEBHOOK_SECURITY = new WebhookSecurity({
  secret: process.env.STRIPE_WEBHOOK_SECRET || '',
  maxAge: 5 * 60 * 1000, // 5 minutes
  requireTimestamp: true,
  requireSignature: true,
  allowedIps: process.env.STRIPE_ALLOWED_IPS?.split(',') || []
});

// ================================
// CONVENIENCE FUNCTIONS
// ================================

export async function validateTallyWebhook(request: NextRequest): Promise<WebhookValidationResult> {
  return TALLY_WEBHOOK_SECURITY.validateWebhook(request);
}

export async function validateStripeWebhook(request: NextRequest): Promise<WebhookValidationResult> {
  return STRIPE_WEBHOOK_SECURITY.validateWebhook(request);
}

// ================================
// SECURITY HEADERS
// ================================

export function getSecurityHeaders(): Record<string, string> {
  return {
    'X-Content-Type-Options': 'nosniff',
    'X-Frame-Options': 'DENY',
    'X-XSS-Protection': '1; mode=block',
    'Referrer-Policy': 'strict-origin-when-cross-origin',
    'Permissions-Policy': 'camera=(), microphone=(), geolocation=()',
    'Strict-Transport-Security': 'max-age=31536000; includeSubDomains; preload'
  };
}

// ================================
// RATE LIMITING HELPERS
// ================================

export function getRateLimitHeaders(
  remaining: number,
  resetTime: number,
  limit: number
): Record<string, string> {
  return {
    'X-RateLimit-Limit': limit.toString(),
    'X-RateLimit-Remaining': remaining.toString(),
    'X-RateLimit-Reset': resetTime.toString(),
    'Retry-After': Math.ceil((resetTime - Date.now()) / 1000).toString()
  };
}
