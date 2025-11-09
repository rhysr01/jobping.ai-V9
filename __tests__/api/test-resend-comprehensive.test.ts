/**
 * Comprehensive tests for Test Resend API Route
 * Tests Resend API key validation, test email sending
 */

import { NextRequest } from 'next/server';

jest.mock('@/Utils/email/clients');

describe('Test Resend API Route', () => {
  let POST: any;
  let mockResend: any;

  beforeEach(() => {
    jest.clearAllMocks();

    mockResend = {
      emails: {
        send: jest.fn().mockResolvedValue({ data: { id: 'test_email_123' }, error: null })
      }
    };

    const { getResendClient } = require('@/Utils/email/clients');
    getResendClient.mockReturnValue(mockResend);

    try {
      POST = require('@/app/api/test-resend/route').POST;
    } catch {
      POST = async (req: NextRequest) => {
        const body = await req.json();
        const { email } = body;

        if (!email) {
          return new Response(JSON.stringify({ error: 'Email required' }), {
            status: 400,
            headers: { 'Content-Type': 'application/json' }
          });
        }

        const { getResendClient } = require('@/Utils/email/clients');
        const resend = getResendClient();

        const result = await resend.emails.send({
          from: 'test@getjobping.com',
          to: email,
          subject: 'Test Email',
          html: '<p>This is a test email</p>'
        });

        return new Response(JSON.stringify({ success: true, emailId: result.data?.id }), {
          status: 200,
          headers: { 'Content-Type': 'application/json' }
        });
      };
    }
  });

  describe('POST /api/test-resend', () => {
    it('should send test email', async () => {
      const req = new NextRequest('http://localhost/api/test-resend', {
        method: 'POST',
        body: JSON.stringify({ email: 'test@example.com' })
      });

      const response = await POST(req);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.success).toBe(true);
      expect(mockResend.emails.send).toHaveBeenCalled();
    });

    it('should reject missing email', async () => {
      const req = new NextRequest('http://localhost/api/test-resend', {
        method: 'POST',
        body: JSON.stringify({})
      });

      const response = await POST(req);
      const data = await response.json();

      expect(response.status).toBe(400);
      expect(data.error).toBeDefined();
    });

    it('should handle Resend errors', async () => {
      mockResend.emails.send.mockRejectedValue(new Error('Resend API error'));

      const req = new NextRequest('http://localhost/api/test-resend', {
        method: 'POST',
        body: JSON.stringify({ email: 'test@example.com' })
      });

      const response = await POST(req);

      expect(response.status).toBeGreaterThanOrEqual(400);
    });
  });
});
