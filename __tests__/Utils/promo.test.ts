/**
 * Tests for Promo Code Validation
 * Tests promo code validation logic
 */

import { validatePromoCode } from '@/Utils/promo';

describe('Promo Code Validation', () => {
  const originalEnv = process.env;

  beforeEach(() => {
    // Reset env before each test
    jest.resetModules();
    process.env = { ...originalEnv };
  });

  afterAll(() => {
    process.env = originalEnv;
  });

  describe('Basic validation', () => {
    it('should accept valid promo code (default: rhys)', () => {
      const result = validatePromoCode('rhys', 'user@example.com');

      expect(result.isValid).toBe(true);
      expect(result.reason).toBeUndefined();
    });

    it('should accept promo code case-insensitively', () => {
      expect(validatePromoCode('RHYS', 'user@example.com').isValid).toBe(true);
      expect(validatePromoCode('Rhys', 'user@example.com').isValid).toBe(true);
      expect(validatePromoCode('rhYs', 'user@example.com').isValid).toBe(true);
    });

    it('should trim whitespace from promo code', () => {
      expect(validatePromoCode('  rhys  ', 'user@example.com').isValid).toBe(true);
      expect(validatePromoCode('rhys ', 'user@example.com').isValid).toBe(true);
      expect(validatePromoCode(' rhys', 'user@example.com').isValid).toBe(true);
    });

    it('should reject invalid promo code', () => {
      const result = validatePromoCode('wrongcode', 'user@example.com');

      expect(result.isValid).toBe(false);
      expect(result.reason).toBe('invalid_code');
    });

    it('should reject empty promo code', () => {
      const result = validatePromoCode('', 'user@example.com');

      expect(result.isValid).toBe(false);
      expect(result.reason).toBe('missing_code');
    });

    it('should reject null promo code', () => {
      const result = validatePromoCode(null, 'user@example.com');

      expect(result.isValid).toBe(false);
      expect(result.reason).toBe('missing_code');
    });

    it('should reject undefined promo code', () => {
      const result = validatePromoCode(undefined, 'user@example.com');

      expect(result.isValid).toBe(false);
      expect(result.reason).toBe('missing_code');
    });

    it('should reject whitespace-only promo code', () => {
      const result = validatePromoCode('   ', 'user@example.com');

      expect(result.isValid).toBe(false);
      expect(result.reason).toBe('missing_code');
    });
  });

  describe('Custom promo codes', () => {
    it('should accept custom promo code from env', () => {
      process.env.PROMO_CODE = 'CUSTOM123';

      const result = validatePromoCode('custom123', 'user@example.com');

      expect(result.isValid).toBe(true);
    });

    it('should reject default code when custom code is set', () => {
      process.env.PROMO_CODE = 'CUSTOM123';

      const result = validatePromoCode('rhys', 'user@example.com');

      expect(result.isValid).toBe(false);
      expect(result.reason).toBe('invalid_code');
    });
  });

  describe('Email allowlist', () => {
    it('should accept email matching allowlist regex', () => {
      process.env.PROMO_EMAIL_ALLOWLIST = '@company\\.com$';

      const result = validatePromoCode('rhys', 'user@company.com');

      expect(result.isValid).toBe(true);
    });

    it('should reject email not matching allowlist regex', () => {
      process.env.PROMO_EMAIL_ALLOWLIST = '@company\\.com$';

      const result = validatePromoCode('rhys', 'user@other.com');

      expect(result.isValid).toBe(false);
      expect(result.reason).toBe('email_not_allowed');
    });

    it('should accept any email when no allowlist is set', () => {
      delete process.env.PROMO_EMAIL_ALLOWLIST;

      expect(validatePromoCode('rhys', 'user@company.com').isValid).toBe(true);
      expect(validatePromoCode('rhys', 'user@other.com').isValid).toBe(true);
      expect(validatePromoCode('rhys', 'anyone@anywhere.org').isValid).toBe(true);
    });

    it('should handle complex regex patterns', () => {
      process.env.PROMO_EMAIL_ALLOWLIST = '^(admin|support)@company\\.com$';

      expect(validatePromoCode('rhys', 'admin@company.com').isValid).toBe(true);
      expect(validatePromoCode('rhys', 'support@company.com').isValid).toBe(true);
      expect(validatePromoCode('rhys', 'user@company.com').isValid).toBe(false);
    });

    it('should handle invalid regex gracefully', () => {
      process.env.PROMO_EMAIL_ALLOWLIST = '[invalid(regex';

      const result = validatePromoCode('rhys', 'user@company.com');

      expect(result.isValid).toBe(false);
      expect(result.reason).toBe('invalid_allowlist_regex');
    });

    it('should be case-sensitive for email matching', () => {
      process.env.PROMO_EMAIL_ALLOWLIST = '@Company\\.com$';

      expect(validatePromoCode('rhys', 'user@Company.com').isValid).toBe(true);
      expect(validatePromoCode('rhys', 'user@company.com').isValid).toBe(false);
    });

    it('should support domain-based allowlist', () => {
      process.env.PROMO_EMAIL_ALLOWLIST = '@(google|microsoft)\\.com$';

      expect(validatePromoCode('rhys', 'user@google.com').isValid).toBe(true);
      expect(validatePromoCode('rhys', 'user@microsoft.com').isValid).toBe(true);
      expect(validatePromoCode('rhys', 'user@apple.com').isValid).toBe(false);
    });
  });

  describe('Combined validation', () => {
    it('should validate both code and email allowlist', () => {
      process.env.PROMO_CODE = 'SPECIAL';
      process.env.PROMO_EMAIL_ALLOWLIST = '@vip\\.com$';

      // Wrong code
      expect(validatePromoCode('rhys', 'user@vip.com').isValid).toBe(false);

      // Wrong email
      expect(validatePromoCode('special', 'user@normal.com').isValid).toBe(false);

      // Both correct
      expect(validatePromoCode('special', 'user@vip.com').isValid).toBe(true);
    });

    it('should fail fast on missing code', () => {
      process.env.PROMO_EMAIL_ALLOWLIST = '@company\\.com$';

      const result = validatePromoCode('', 'user@company.com');

      expect(result.isValid).toBe(false);
      expect(result.reason).toBe('missing_code');
    });

    it('should check code before email allowlist', () => {
      process.env.PROMO_EMAIL_ALLOWLIST = '@company\\.com$';

      const result = validatePromoCode('wrongcode', 'user@company.com');

      expect(result.isValid).toBe(false);
      expect(result.reason).toBe('invalid_code');
    });
  });
});

