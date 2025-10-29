/**
 * Shared HMAC Authentication Utility
 * Provides consistent HMAC verification across all API endpoints
 */

import crypto from 'crypto';

const HMAC_SECRET = process.env.INTERNAL_API_HMAC_SECRET;

export interface HMACVerificationResult {
  isValid: boolean;
  error?: string;
}

/**
 * Verify HMAC signature with consistent rules across endpoints
 * Policy: Mandatory in production, optional in test/development
 */
export function verifyHMAC(
  data: string,
  signature: string,
  timestamp: number,
  maxAgeMinutes: number = 5
): HMACVerificationResult {
  // In test/development, HMAC is optional
  if (process.env.NODE_ENV === 'test' || process.env.NODE_ENV === 'development') {
    if (!signature || !timestamp) {
      return { isValid: true }; // Allow missing auth in dev/test
    }
  }

  // In production, HMAC is mandatory
  if (!HMAC_SECRET) {
    return { isValid: false, error: 'HMAC secret not configured' };
  }

  if (!signature || !timestamp) {
    return { isValid: false, error: 'Missing signature or timestamp' };
  }

  // Check timestamp is within allowed window
  const now = Date.now();
  const ageMinutes = Math.abs(now - timestamp) / (1000 * 60);
  
  if (ageMinutes > maxAgeMinutes) {
    return { isValid: false, error: `Timestamp too old: ${ageMinutes.toFixed(1)} minutes` };
  }

  // Generate expected signature
  const expectedSignature = crypto
    .createHmac('sha256', HMAC_SECRET)
    .update(data)
    .digest('hex');

  // Use timing-safe comparison
  const isValid = crypto.timingSafeEqual(
    Buffer.from(signature, 'hex'),
    Buffer.from(expectedSignature, 'hex')
  );

  return { isValid, error: isValid ? undefined : 'Invalid signature' };
}

/**
 * Generate HMAC signature for testing
 */
export function generateHMAC(data: string): string {
  if (!HMAC_SECRET) {
    throw new Error('HMAC secret not configured');
  }
  
  return crypto
    .createHmac('sha256', HMAC_SECRET)
    .update(data)
    .digest('hex');
}

/**
 * Check if HMAC is required (secret is configured)
 */
export function isHMACRequired(): boolean {
  return !!HMAC_SECRET;
}
