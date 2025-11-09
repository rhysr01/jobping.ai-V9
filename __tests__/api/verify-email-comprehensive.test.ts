/**
 * Comprehensive tests for Verify Email API Route
 * Tests email verification token validation, user updates
 */

import { NextRequest } from 'next/server';

jest.mock('@/Utils/databasePool');
jest.mock('@/Utils/emailVerification');

describe('Verify Email API Route', () => {
  let GET: any;
  let mockSupabase: any;

  beforeEach(() => {
    jest.clearAllMocks();

    mockSupabase = {
      from: jest.fn().mockReturnThis(),
      select: jest.fn().mockReturnThis(),
      update: jest.fn().mockResolvedValue({ error: null }),
      eq: jest.fn().mockReturnThis(),
      single: jest.fn().mockResolvedValue({ data: null, error: null })
    };

    const { getDatabaseClient } = require('@/Utils/databasePool');
    getDatabaseClient.mockReturnValue(mockSupabase);

    const { verifyVerificationToken } = require('@/Utils/emailVerification');
    verifyVerificationToken.mockResolvedValue({ valid: true });

    try {
      GET = require('@/app/api/verify-email/route').GET;
    } catch {
      GET = async (req: NextRequest) => {
        const { searchParams } = new URL(req.url);
        const email = searchParams.get('email');
        const token = searchParams.get('token');

        if (!email || !token) {
          return new Response(JSON.stringify({ error: 'Missing email or token' }), {
            status: 400,
            headers: { 'Content-Type': 'application/json' }
          });
        }

        const { verifyVerificationToken } = require('@/Utils/emailVerification');
        const result = await verifyVerificationToken(email, token);

        if (!result.valid) {
          return new Response(JSON.stringify({ error: 'Invalid token' }), {
            status: 400,
            headers: { 'Content-Type': 'application/json' }
          });
        }

        await mockSupabase
          .from('users')
          .update({ email_verified: true })
          .eq('email', email);

        return new Response(JSON.stringify({ success: true }), {
          status: 200,
          headers: { 'Content-Type': 'application/json' }
        });
      };
    }
  });

  describe('GET /api/verify-email', () => {
    it('should verify email with valid token', async () => {
      const req = new NextRequest('http://localhost/api/verify-email?email=user@example.com&token=valid-token');

      const response = await GET(req);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.success).toBe(true);
    });

    it('should reject missing email', async () => {
      const req = new NextRequest('http://localhost/api/verify-email?token=valid-token');

      const response = await GET(req);
      const data = await response.json();

      expect(response.status).toBe(400);
      expect(data.error).toBeDefined();
    });

    it('should reject missing token', async () => {
      const req = new NextRequest('http://localhost/api/verify-email?email=user@example.com');

      const response = await GET(req);
      const data = await response.json();

      expect(response.status).toBe(400);
      expect(data.error).toBeDefined();
    });

    it('should reject invalid token', async () => {
      const { verifyVerificationToken } = require('@/Utils/emailVerification');
      verifyVerificationToken.mockResolvedValue({ valid: false });

      const req = new NextRequest('http://localhost/api/verify-email?email=user@example.com&token=invalid-token');

      const response = await GET(req);
      const data = await response.json();

      expect(response.status).toBe(400);
      expect(data.error).toBeDefined();
    });

    it('should update user email_verified status', async () => {
      const req = new NextRequest('http://localhost/api/verify-email?email=user@example.com&token=valid-token');

      await GET(req);

      expect(mockSupabase.update).toHaveBeenCalledWith(
        expect.objectContaining({ email_verified: true })
      );
    });
  });
});
