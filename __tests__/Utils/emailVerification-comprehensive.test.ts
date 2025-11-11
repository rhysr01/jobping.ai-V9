import { createHash } from 'crypto';

import {
  generateVerificationToken,
  persistVerificationToken,
  verifyVerificationToken,
  sendVerificationEmail,
  checkEmailVerificationStatus,
  markUserVerified,
} from '@/Utils/emailVerification';

jest.mock('@/Utils/email/clients', () => ({
  getResendClient: jest.fn(),
  EMAIL_CONFIG: { from: 'JobPing <noreply@getjobping.com>' },
  assertValidFrom: jest.fn(),
}));

jest.mock('@/Utils/databasePool', () => ({
  getDatabaseClient: jest.fn(),
}));

describe('Email Verification Utilities', () => {
  const verificationQuery = {
    upsert: jest.fn().mockResolvedValue({ error: null }),
    select: jest.fn().mockReturnThis(),
    eq: jest.fn().mockReturnThis(),
    is: jest.fn().mockReturnThis(),
    single: jest.fn(),
    update: jest.fn().mockReturnThis(),
  };

  const usersQuery = {
    update: jest.fn().mockReturnThis(),
    eq: jest.fn().mockReturnThis(),
    select: jest.fn().mockReturnThis(),
    single: jest.fn(),
  };

  const mockSupabase = {
    from: jest.fn((table: string) => {
      if (table === 'email_verification_requests') {
        return verificationQuery;
      }
      return usersQuery;
    }),
  };

  const mockResend = {
    emails: {
      send: jest.fn().mockResolvedValue({ data: { id: 'email_123' }, error: null }),
    },
  };

  beforeAll(() => {
    process.env.INTERNAL_API_HMAC_SECRET = 'a'.repeat(32);
    process.env.NEXT_PUBLIC_SUPABASE_URL = 'https://example.supabase.co';
    process.env.SUPABASE_SERVICE_ROLE_KEY = 'service_role_key_example_1234567890';
    process.env.RESEND_API_KEY = 're_test_api_key';
  });

  beforeEach(() => {
    jest.clearAllMocks();

    const { getDatabaseClient } = require('@/Utils/databasePool');
    getDatabaseClient.mockReturnValue(mockSupabase);

    const { getResendClient } = require('@/Utils/email/clients');
    getResendClient.mockReturnValue(mockResend);

    verificationQuery.upsert.mockClear();
    verificationQuery.select.mockReturnThis();
    verificationQuery.eq.mockReturnThis();
    verificationQuery.is.mockReturnThis();
    verificationQuery.single.mockReset();
    verificationQuery.update.mockReturnThis();

    usersQuery.update.mockReturnThis();
    usersQuery.eq.mockReturnThis();
    usersQuery.select.mockReturnThis();
    usersQuery.single.mockReset();
  });

  describe('generateVerificationToken', () => {
    it('returns a signed token string', () => {
      const token = generateVerificationToken('user@example.com');
      expect(token).toEqual(expect.any(String));
      expect(token.length).toBeGreaterThan(10);
    });
  });

  describe('persistVerificationToken', () => {
    it('stores a hashed token entry', async () => {
      const token = generateVerificationToken('user@example.com');
      const expiresAt = Date.now() + 3_600_000;

      await persistVerificationToken('user@example.com', token, expiresAt);

      expect(verificationQuery.upsert).toHaveBeenCalledWith(
        expect.objectContaining({
          email: 'user@example.com',
          token_hash: createHash('sha256').update(token).digest('hex'),
        })
      );
    });
  });

  describe('verifyVerificationToken', () => {
    it('validates a stored token', async () => {
      const token = generateVerificationToken('user@example.com');
      const tokenHash = createHash('sha256').update(token).digest('hex');

      verificationQuery.single.mockResolvedValue({
        data: {
          email: 'user@example.com',
          token_hash: tokenHash,
          expires_at: new Date(Date.now() + 3_600_000).toISOString(),
        },
        error: null,
      });

      const result = await verifyVerificationToken('user@example.com', token);
      expect(result.valid).toBe(true);
      expect(verificationQuery.update).toHaveBeenCalled();
    });

    it('rejects expired tokens', async () => {
      const token = generateVerificationToken('user@example.com');
      const tokenHash = createHash('sha256').update(token).digest('hex');

      verificationQuery.single.mockResolvedValue({
        data: {
          email: 'user@example.com',
          token_hash: tokenHash,
          expires_at: new Date(Date.now() - 3_600_000).toISOString(),
        },
        error: null,
      });

      const result = await verifyVerificationToken('user@example.com', token);
      expect(result.valid).toBe(false);
      expect(result.reason).toBe('Token expired');
    });

    it('rejects missing database entries', async () => {
      verificationQuery.single.mockResolvedValue({
        data: null,
        error: null,
      });

      const result = await verifyVerificationToken('user@example.com', 'invalid');
      expect(result.valid).toBe(false);
    });
  });

  describe('sendVerificationEmail', () => {
    it('sends email and persists token', async () => {
      const token = generateVerificationToken('user@example.com');
      const tokenHash = createHash('sha256').update(token).digest('hex');

      verificationQuery.single.mockResolvedValue({
        data: {
          email: 'user@example.com',
          token_hash: tokenHash,
          expires_at: new Date(Date.now() + 3_600_000).toISOString(),
        },
        error: null,
      });

      await sendVerificationEmail('user@example.com');

      expect(mockResend.emails.send).toHaveBeenCalled();
      expect(verificationQuery.upsert).toHaveBeenCalled();
      const payload = mockResend.emails.send.mock.calls[0][0];
      expect(payload.to).toEqual(['user@example.com']);
      expect(payload.html).toContain('/api/verify-email');
    });
  });

  describe('markUserVerified', () => {
    it('updates user verification flag', async () => {
      await markUserVerified('user@example.com');
      expect(usersQuery.update).toHaveBeenCalledWith(
        expect.objectContaining({
          email_verified: true,
        })
      );
    });
  });

  describe('checkEmailVerificationStatus', () => {
    it('returns verification status', async () => {
      usersQuery.single.mockResolvedValue({
        data: { email_verified: true },
        error: null,
      });

      const status = await checkEmailVerificationStatus('user@example.com');
      expect(status.verified).toBe(true);
    });

    it('handles missing user records', async () => {
      usersQuery.single.mockResolvedValue({
        data: null,
        error: new Error('missing'),
      });

      const status = await checkEmailVerificationStatus('user@example.com');
      expect(status.verified).toBe(false);
    });
  });
});

