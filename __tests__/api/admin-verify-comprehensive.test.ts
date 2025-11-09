/**
 * Comprehensive tests for Admin Verify API Route
 * Tests Basic auth verification
 */

import { GET } from '@/app/api/admin/verify/route';
import { NextRequest } from 'next/server';

describe('Admin Verify API Route', () => {
  let mockRequest: NextRequest;

  beforeEach(() => {
    jest.clearAllMocks();
    delete process.env.ADMIN_BASIC_USER;
    delete process.env.ADMIN_BASIC_PASS;
  });

  describe('GET /api/admin/verify', () => {
    it('should return 403 if credentials not configured', async () => {
      mockRequest = {
        method: 'GET',
        headers: new Headers()
      } as any;

      const response = await GET(mockRequest);
      const data = await response.json();

      expect(response.status).toBe(403);
      expect(data.ok).toBe(false);
    });

    it('should return 401 if no authorization header', async () => {
      process.env.ADMIN_BASIC_USER = 'admin';
      process.env.ADMIN_BASIC_PASS = 'password';

      mockRequest = {
        method: 'GET',
        headers: new Headers()
      } as any;

      const response = await GET(mockRequest);
      const data = await response.json();

      expect(response.status).toBe(401);
      expect(data.ok).toBe(false);
    });

    it('should return 401 if invalid credentials', async () => {
      process.env.ADMIN_BASIC_USER = 'admin';
      process.env.ADMIN_BASIC_PASS = 'password';

      const credentials = Buffer.from('wrong:password').toString('base64');
      mockRequest = {
        method: 'GET',
        headers: new Headers({
          'authorization': `Basic ${credentials}`
        })
      } as any;

      const response = await GET(mockRequest);
      const data = await response.json();

      expect(response.status).toBe(401);
      expect(data.ok).toBe(false);
    });

    it('should return 200 with valid credentials', async () => {
      process.env.ADMIN_BASIC_USER = 'admin';
      process.env.ADMIN_BASIC_PASS = 'password';

      const credentials = Buffer.from('admin:password').toString('base64');
      mockRequest = {
        method: 'GET',
        headers: new Headers({
          'authorization': `Basic ${credentials}`
        })
      } as any;

      const response = await GET(mockRequest);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.ok).toBe(true);
    });

    it('should handle malformed authorization header', async () => {
      process.env.ADMIN_BASIC_USER = 'admin';
      process.env.ADMIN_BASIC_PASS = 'password';

      mockRequest = {
        method: 'GET',
        headers: new Headers({
          'authorization': 'Invalid'
        })
      } as any;

      const response = await GET(mockRequest);
      const data = await response.json();

      expect(response.status).toBe(401);
      expect(data.ok).toBe(false);
    });
  });
});

