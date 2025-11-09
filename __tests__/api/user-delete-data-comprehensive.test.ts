/**
 * Tests for User Delete Data API Route
 * Tests GDPR-compliant user data deletion
 */

import { POST, GET } from '@/app/api/user/delete-data/route';
import { NextRequest } from 'next/server';

jest.mock('@/Utils/supabase');
jest.mock('@/lib/errors', () => ({
  asyncHandler: (fn: any) => fn,
  ValidationError: class extends Error {
    constructor(message: string) {
      super(message);
      this.name = 'ValidationError';
    }
  }
}));

describe('User Delete Data API Route', () => {
  let mockRequest: NextRequest;
  let mockSupabase: any;

  beforeEach(() => {
    jest.clearAllMocks();

    mockRequest = {
      method: 'POST',
      json: jest.fn(),
      headers: new Headers()
    } as any;

    mockSupabase = {
      from: jest.fn().mockReturnThis(),
      delete: jest.fn().mockReturnThis(),
      eq: jest.fn().mockResolvedValue({
        data: [{ id: 1 }],
        error: null
      })
    };

    const { getSupabaseClient } = require('@/Utils/supabase');
    getSupabaseClient.mockReturnValue(mockSupabase);
  });

  describe('POST /api/user/delete-data', () => {
    it('should delete user data from all tables', async () => {
      mockRequest.json.mockResolvedValue({
        email: 'user@example.com'
      });

      const response = await POST(mockRequest);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.success).toBe(true);
      expect(data.summary).toBeDefined();
      expect(data.summary.totalTables).toBe(8);
      
      // Should delete from all tables
      expect(mockSupabase.from).toHaveBeenCalledTimes(8);
    });

    it('should require email', async () => {
      mockRequest.json.mockResolvedValue({});

      await expect(POST(mockRequest)).rejects.toThrow();
    });

    it('should delete from user_matches table', async () => {
      mockRequest.json.mockResolvedValue({
        email: 'user@example.com'
      });

      await POST(mockRequest);

      expect(mockSupabase.from).toHaveBeenCalledWith('user_matches');
    });

    it('should delete from user_feedback table', async () => {
      mockRequest.json.mockResolvedValue({
        email: 'user@example.com'
      });

      await POST(mockRequest);

      expect(mockSupabase.from).toHaveBeenCalledWith('user_feedback');
    });

    it('should delete from users table last', async () => {
      mockRequest.json.mockResolvedValue({
        email: 'user@example.com'
      });

      await POST(mockRequest);

      const calls = mockSupabase.from.mock.calls;
      expect(calls[calls.length - 1][0]).toBe('users');
    });

    it('should handle partial deletion failures', async () => {
      mockRequest.json.mockResolvedValue({
        email: 'user@example.com'
      });

      // Some deletions succeed, some fail
      mockSupabase.eq
        .mockResolvedValueOnce({ data: [{ id: 1 }], error: null })
        .mockResolvedValueOnce({ data: null, error: { message: 'Error' } })
        .mockResolvedValue({ data: [{ id: 1 }], error: null });

      const response = await POST(mockRequest);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.summary.failed).toBeGreaterThan(0);
      expect(data.summary.successful).toBeLessThan(8);
    });

    it('should return deletion summary', async () => {
      mockRequest.json.mockResolvedValue({
        email: 'user@example.com'
      });

      const response = await POST(mockRequest);
      const data = await response.json();

      expect(data.summary.details).toBeDefined();
      expect(data.summary.details.length).toBe(8);
    });
  });

  describe('GET /api/user/delete-data', () => {
    beforeEach(() => {
      mockRequest.method = 'GET';
    });

    it('should return endpoint information', async () => {
      const response = await GET();
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.message).toBeDefined();
      expect(data.usage).toBeDefined();
    });
  });
});

