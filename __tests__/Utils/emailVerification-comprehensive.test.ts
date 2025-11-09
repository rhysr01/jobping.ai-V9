/**
 * Comprehensive tests for Email Verification Utility
 * Tests token generation, verification, expiration
 */

import {
  generateVerificationToken,
  verifyVerificationToken,
  sendVerificationEmail,
  checkEmailVerificationStatus
} from '@/Utils/emailVerification';

jest.mock('@/Utils/email/clients');
jest.mock('@/Utils/databasePool');
jest.mock('crypto', () => ({
  randomBytes: jest.fn(() => Buffer.from('test-token')),
  createHash: jest.fn(() => ({
    update: jest.fn().mockReturnThis(),
    digest: jest.fn(() => 'hashed-token')
  }))
}));

describe('Email Verification', () => {
  let mockSupabase: any;
  let mockResend: any;

  beforeEach(() => {
    jest.clearAllMocks();

    mockSupabase = {
      from: jest.fn().mockReturnThis(),
      select: jest.fn().mockReturnThis(),
      insert: jest.fn().mockResolvedValue({ error: null }),
      update: jest.fn().mockResolvedValue({ error: null }),
      eq: jest.fn().mockReturnThis(),
      single: jest.fn().mockResolvedValue({ data: null, error: null })
    };

    mockResend = {
      emails: {
        send: jest.fn().mockResolvedValue({ data: { id: 'email_123' }, error: null })
      }
    };

    const { getDatabaseClient } = require('@/Utils/databasePool');
    getDatabaseClient.mockReturnValue(mockSupabase);

    const { getResendClient } = require('@/Utils/email/clients');
    getResendClient.mockReturnValue(mockResend);
  });

  describe('generateVerificationToken', () => {
    it('should generate verification token', async () => {
      const token = await generateVerificationToken('user@example.com');

      expect(token).toBeDefined();
      expect(typeof token).toBe('string');
    });

    it('should store token in database', async () => {
      await generateVerificationToken('user@example.com');

      expect(mockSupabase.insert).toHaveBeenCalled();
    });
  });

  describe('verifyVerificationToken', () => {
    it('should verify valid token', async () => {
      mockSupabase.single.mockResolvedValue({
        data: {
          email: 'user@example.com',
          token: 'test-token',
          expires_at: new Date(Date.now() + 3600000).toISOString()
        },
        error: null
      });

      const result = await verifyVerificationToken('user@example.com', 'test-token');

      expect(result.valid).toBe(true);
    });

    it('should reject expired token', async () => {
      mockSupabase.single.mockResolvedValue({
        data: {
          email: 'user@example.com',
          token: 'test-token',
          expires_at: new Date(Date.now() - 3600000).toISOString()
        },
        error: null
      });

      const result = await verifyVerificationToken('user@example.com', 'test-token');

      expect(result.valid).toBe(false);
    });

    it('should reject invalid token', async () => {
      mockSupabase.single.mockResolvedValue({
        data: null,
        error: null
      });

      const result = await verifyVerificationToken('user@example.com', 'invalid-token');

      expect(result.valid).toBe(false);
    });
  });

  describe('sendVerificationEmail', () => {
    it('should send verification email', async () => {
      await sendVerificationEmail('user@example.com', 'test-token');

      expect(mockResend.emails.send).toHaveBeenCalled();
    });

    it('should include verification link', async () => {
      await sendVerificationEmail('user@example.com', 'test-token');

      const call = mockResend.emails.send.mock.calls[0][0];
      expect(call.html).toContain('test-token');
    });
  });

  describe('checkEmailVerificationStatus', () => {
    it('should check verification status', async () => {
      mockSupabase.single.mockResolvedValue({
        data: { email_verified: true },
        error: null
      });

      const status = await checkEmailVerificationStatus('user@example.com');

      expect(status.verified).toBe(true);
    });

    it('should return false for unverified email', async () => {
      mockSupabase.single.mockResolvedValue({
        data: { email_verified: false },
        error: null
      });

      const status = await checkEmailVerificationStatus('user@example.com');

      expect(status.verified).toBe(false);
    });
  });
});

