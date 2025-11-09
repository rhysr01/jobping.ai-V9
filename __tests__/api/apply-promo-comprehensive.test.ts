/**
 * Tests for Apply Promo API Route
 * Tests promo code application
 */

import { POST } from '@/app/api/apply-promo/route';
import { NextRequest } from 'next/server';

jest.mock('@/Utils/databasePool');
jest.mock('@/lib/errors', () => ({
  asyncHandler: (fn: any) => fn,
  ValidationError: class extends Error {
    constructor(message: string) {
      super(message);
      this.name = 'ValidationError';
    }
  },
  AppError: class extends Error {
    constructor(message: string, status: number, code: string, details?: any) {
      super(message);
      this.name = 'AppError';
      this.status = status;
      this.code = code;
      this.details = details;
    }
  }
}));

describe('Apply Promo API Route', () => {
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
      select: jest.fn().mockReturnThis(),
      update: jest.fn().mockResolvedValue({ error: null }),
      upsert: jest.fn().mockResolvedValue({ error: null }),
      eq: jest.fn().mockReturnThis(),
      single: jest.fn().mockResolvedValue({
        data: null,
        error: { code: 'PGRST116' }
      })
    };

    const { getDatabaseClient } = require('@/Utils/databasePool');
    getDatabaseClient.mockReturnValue(mockSupabase);
  });

  describe('POST /api/apply-promo', () => {
    it('should upgrade existing user to premium', async () => {
      mockRequest.json.mockResolvedValue({
        email: 'user@example.com',
        promoCode: 'rhys'
      });

      mockSupabase.single.mockResolvedValue({
        data: { id: '1', email: 'user@example.com', subscription_active: false },
        error: null
      });

      const response = await POST(mockRequest);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.success).toBe(true);
      expect(data.existingUser).toBe(true);
      expect(mockSupabase.update).toHaveBeenCalled();
    });

    it('should store promo for new user', async () => {
      mockRequest.json.mockResolvedValue({
        email: 'newuser@example.com',
        promoCode: 'rhys'
      });

      mockSupabase.single.mockResolvedValue({
        data: null,
        error: { code: 'PGRST116' }
      });

      const response = await POST(mockRequest);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.success).toBe(true);
      expect(data.existingUser).toBe(false);
      expect(data.redirectUrl).toContain('/signup');
      expect(mockSupabase.upsert).toHaveBeenCalled();
    });

    it('should require email and promo code', async () => {
      mockRequest.json.mockResolvedValue({
        email: 'user@example.com'
        // Missing promoCode
      });

      await expect(POST(mockRequest)).rejects.toThrow();
    });

    it('should validate promo code', async () => {
      mockRequest.json.mockResolvedValue({
        email: 'user@example.com',
        promoCode: 'invalid'
      });

      await expect(POST(mockRequest)).rejects.toThrow('Invalid promo code');
    });

    it('should be case insensitive for promo code', async () => {
      mockRequest.json.mockResolvedValue({
        email: 'user@example.com',
        promoCode: 'RHYs'
      });

      mockSupabase.single.mockResolvedValue({
        data: { id: '1', subscription_active: false },
        error: null
      });

      const response = await POST(mockRequest);

      expect(response.status).toBe(200);
    });

    it('should handle database update errors', async () => {
      mockRequest.json.mockResolvedValue({
        email: 'user@example.com',
        promoCode: 'rhys'
      });

      mockSupabase.single.mockResolvedValue({
        data: { id: '1' },
        error: null
      });

      mockSupabase.update.mockResolvedValue({
        error: { message: 'Update failed' }
      });

      await expect(POST(mockRequest)).rejects.toThrow();
    });
  });
});

