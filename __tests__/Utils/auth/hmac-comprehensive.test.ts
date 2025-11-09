/**
 * Comprehensive tests for HMAC Authentication
 * Tests all functions including edge cases and error handling
 */

import {
  hmacSign,
  hmacVerify,
  verifyHMAC,
  generateHMAC,
  isHMACRequired
} from '@/Utils/auth/hmac';

describe('HMAC Authentication - Comprehensive', () => {
  const originalEnv = process.env.NODE_ENV;
  const originalSecret = process.env.INTERNAL_API_HMAC_SECRET;

  beforeEach(() => {
    process.env.INTERNAL_API_HMAC_SECRET = 'test-secret-key-123';
    jest.clearAllMocks();
  });

  afterEach(() => {
    process.env.NODE_ENV = originalEnv;
    process.env.INTERNAL_API_HMAC_SECRET = originalSecret;
  });

  describe('hmacSign', () => {
    it('should generate valid HMAC signature', () => {
      const data = 'test-data';
      const signature = hmacSign(data);

      expect(signature).toBeDefined();
      expect(typeof signature).toBe('string');
      expect(signature.length).toBeGreaterThan(0);
    });

    it('should generate same signature for same data', () => {
      const data = 'test-data';
      const sig1 = hmacSign(data);
      const sig2 = hmacSign(data);

      expect(sig1).toBe(sig2);
    });

    it('should generate different signatures for different data', () => {
      const sig1 = hmacSign('data1');
      const sig2 = hmacSign('data2');

      expect(sig1).not.toBe(sig2);
    });

    it('should accept custom secret', () => {
      const data = 'test-data';
      const customSecret = 'custom-secret';
      const sig1 = hmacSign(data, customSecret);
      const sig2 = hmacSign(data, customSecret);

      expect(sig1).toBe(sig2);
      expect(sig1).not.toBe(hmacSign(data));
    });

    it('should throw error when secret is not configured', () => {
      const originalSecret = process.env.INTERNAL_API_HMAC_SECRET;
      delete process.env.INTERNAL_API_HMAC_SECRET;

      expect(() => {
        hmacSign('test-data');
      }).toThrow('HMAC secret not configured');

      process.env.INTERNAL_API_HMAC_SECRET = originalSecret;
    });

    it('should handle empty string', () => {
      const signature = hmacSign('');

      expect(signature).toBeDefined();
      expect(typeof signature).toBe('string');
    });

    it('should handle special characters', () => {
      const data = 'test-data-!@#$%^&*()';
      const signature = hmacSign(data);

      expect(signature).toBeDefined();
      expect(hmacVerify(data, signature)).toBe(true);
    });
  });

  describe('hmacVerify', () => {
    it('should verify valid signature', () => {
      const data = 'test-data';
      const signature = hmacSign(data);

      expect(hmacVerify(data, signature)).toBe(true);
    });

    it('should reject invalid signature', () => {
      const data = 'test-data';
      const invalidSignature = 'invalid-signature';

      expect(hmacVerify(data, invalidSignature)).toBe(false);
    });

    it('should reject null signature', () => {
      const data = 'test-data';

      expect(hmacVerify(data, null as any)).toBe(false);
    });

    it('should reject empty signature', () => {
      const data = 'test-data';

      expect(hmacVerify(data, '')).toBe(false);
    });

    it('should verify signature with custom secret', () => {
      const data = 'test-data';
      const customSecret = 'custom-secret';
      const signature = hmacSign(data, customSecret);

      expect(hmacVerify(data, signature, customSecret)).toBe(true);
      expect(hmacVerify(data, signature)).toBe(false);
    });

    it('should return false when secret is not configured', () => {
      delete process.env.INTERNAL_API_HMAC_SECRET;

      expect(hmacVerify('test-data', 'signature')).toBe(false);
    });
  });

  describe('verifyHMAC', () => {
    it('should verify HMAC with timing-safe comparison', () => {
      const data = 'test-data';
      const timestamp = Date.now();
      const signature = hmacSign(data);

      const result = verifyHMAC(data, signature, timestamp);

      expect(result.isValid).toBe(true);
      expect(result.error).toBeUndefined();
    });

    it('should reject expired timestamp', () => {
      const data = 'test-data';
      const timestamp = Date.now() - 10 * 60 * 1000; // 10 minutes ago
      const signature = hmacSign(data);

      const result = verifyHMAC(data, signature, timestamp, 5);

      expect(result.isValid).toBe(false);
      expect(result.error).toContain('too old');
    });

    it('should accept timestamp within window', () => {
      const data = 'test-data';
      const timestamp = Date.now() - 2 * 60 * 1000; // 2 minutes ago
      const signature = hmacSign(data);

      const result = verifyHMAC(data, signature, timestamp, 5);

      expect(result.isValid).toBe(true);
    });

    it('should reject invalid signature', () => {
      const data = 'test-data';
      const timestamp = Date.now();
      const invalidSignature = 'invalid-signature';

      const result = verifyHMAC(data, invalidSignature, timestamp);

      expect(result.isValid).toBe(false);
      expect(result.error).toBe('Invalid signature');
    });

    it('should allow missing auth in test environment', () => {
      process.env.NODE_ENV = 'test';

      const result = verifyHMAC('test-data', '', 0);

      expect(result.isValid).toBe(true);
    });

    it('should allow missing auth in development environment', () => {
      process.env.NODE_ENV = 'development';

      const result = verifyHMAC('test-data', '', 0);

      expect(result.isValid).toBe(true);
    });

    it('should require HMAC in production', () => {
      process.env.NODE_ENV = 'production';
      const originalSecret = process.env.INTERNAL_API_HMAC_SECRET;
      delete process.env.INTERNAL_API_HMAC_SECRET;

      const result = verifyHMAC('test-data', '', 0);

      expect(result.isValid).toBe(false);
      expect(result.error).toBe('HMAC secret not configured');
      
      process.env.INTERNAL_API_HMAC_SECRET = originalSecret;
    });

    it('should require signature in production', () => {
      process.env.NODE_ENV = 'production';

      const result = verifyHMAC('test-data', '', 0);

      expect(result.isValid).toBe(false);
      expect(result.error).toBe('Missing signature or timestamp');
    });

    it('should handle future timestamp', () => {
      const data = 'test-data';
      const timestamp = Date.now() + 10 * 60 * 1000; // 10 minutes in future
      const signature = hmacSign(data);

      const result = verifyHMAC(data, signature, timestamp, 5);

      expect(result.isValid).toBe(false);
      expect(result.error).toContain('too old');
    });

    it('should use custom maxAgeMinutes', () => {
      const data = 'test-data';
      const timestamp = Date.now() - 3 * 60 * 1000; // 3 minutes ago
      const signature = hmacSign(data);

      const result1 = verifyHMAC(data, signature, timestamp, 2);
      const result2 = verifyHMAC(data, signature, timestamp, 5);

      expect(result1.isValid).toBe(false);
      expect(result2.isValid).toBe(true);
    });
  });

  describe('generateHMAC', () => {
    it('should generate HMAC signature', () => {
      const data = 'test-data';
      const signature = generateHMAC(data);

      expect(signature).toBeDefined();
      expect(typeof signature).toBe('string');
      expect(hmacVerify(data, signature)).toBe(true);
    });

    it('should be equivalent to hmacSign', () => {
      const data = 'test-data';
      const sig1 = generateHMAC(data);
      const sig2 = hmacSign(data);

      expect(sig1).toBe(sig2);
    });
  });

  describe('isHMACRequired', () => {
    it('should return true when secret is configured', () => {
      process.env.INTERNAL_API_HMAC_SECRET = 'test-secret';

      expect(isHMACRequired()).toBe(true);
    });

    it('should return false when secret is not configured', () => {
      const originalSecret = process.env.INTERNAL_API_HMAC_SECRET;
      delete process.env.INTERNAL_API_HMAC_SECRET;

      const result = isHMACRequired();
      expect(result).toBe(false);

      process.env.INTERNAL_API_HMAC_SECRET = originalSecret;
    });

    it('should return false when secret is empty string', () => {
      const originalSecret = process.env.INTERNAL_API_HMAC_SECRET;
      process.env.INTERNAL_API_HMAC_SECRET = '';

      const result = isHMACRequired();
      expect(result).toBe(false);

      process.env.INTERNAL_API_HMAC_SECRET = originalSecret;
    });
  });

  describe('Edge Cases', () => {
    it('should handle very long data strings', () => {
      const data = 'a'.repeat(10000);
      const signature = hmacSign(data);

      expect(hmacVerify(data, signature)).toBe(true);
    });

    it('should handle unicode characters', () => {
      const data = 'test-数据-🎉';
      const signature = hmacSign(data);

      expect(hmacVerify(data, signature)).toBe(true);
    });

    it('should handle newlines and special whitespace', () => {
      const data = 'test\ndata\r\nwith\ttabs';
      const signature = hmacSign(data);

      expect(hmacVerify(data, signature)).toBe(true);
    });

    it('should be case sensitive for signatures', () => {
      const data = 'test-data';
      const signature = hmacSign(data);
      const upperSignature = signature.toUpperCase();

      expect(hmacVerify(data, upperSignature)).toBe(false);
    });
  });
});

