/**
 * Tests for Parse CVs Cron API Route
 * Tests CV parsing background job
 */

import { GET } from '@/app/api/cron/parse-cvs/route';
import { NextRequest } from 'next/server';

jest.mock('@/Utils/supabase');
jest.mock('@/Utils/cv/parser.service');
jest.mock('@/lib/errors', () => ({
  asyncHandler: (fn: any) => fn,
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

describe('Parse CVs Cron API Route', () => {
  let mockRequest: NextRequest;
  let mockSupabase: any;

  beforeEach(() => {
    jest.clearAllMocks();

    mockRequest = {
      method: 'GET',
      headers: new Headers()
    } as any;

    mockSupabase = {
      from: jest.fn().mockReturnThis(),
      select: jest.fn().mockReturnThis(),
      upsert: jest.fn().mockResolvedValue({ error: null }),
      not: jest.fn().mockReturnThis(),
      limit: jest.fn().mockResolvedValue({
        data: [],
        error: null
      }),
      in: jest.fn().mockResolvedValue({
        data: []
      })
    };

    const { getSupabaseClient } = require('@/Utils/supabase');
    getSupabaseClient.mockReturnValue(mockSupabase);

    const { getCVParser } = require('@/Utils/cv/parser.service');
    getCVParser.mockReturnValue({
      parseCV: jest.fn().mockResolvedValue({
        skills: ['JavaScript', 'TypeScript'],
        experience: 2
      })
    });
  });

  describe('GET /api/cron/parse-cvs', () => {
    it('should process CVs for users', async () => {
      mockSupabase.limit.mockResolvedValue({
        data: [
          { email: 'user1@example.com', cv_url: 'https://example.com/cv1.pdf' },
          { email: 'user2@example.com', cv_url: 'https://example.com/cv2.pdf' }
        ],
        error: null
      });

      mockSupabase.in.mockResolvedValue({
        data: []
      });

      const response = await GET(mockRequest);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.success).toBe(true);
      expect(data.parsed).toBeDefined();
      expect(data.failed).toBeDefined();
    });

    it('should skip already parsed CVs', async () => {
      mockSupabase.limit.mockResolvedValue({
        data: [
          { email: 'user1@example.com', cv_url: 'https://example.com/cv1.pdf' }
        ],
        error: null
      });

      mockSupabase.in.mockResolvedValue({
        data: [{ user_email: 'user1@example.com' }]
      });

      const response = await GET(mockRequest);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.parsed).toBe(0);
    });

    it('should return message when no CVs to parse', async () => {
      mockSupabase.limit.mockResolvedValue({
        data: [],
        error: null
      });

      const response = await GET(mockRequest);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.message).toContain('No CVs');
    });

    it('should limit processing to 50 CVs', async () => {
      await GET(mockRequest);

      expect(mockSupabase.limit).toHaveBeenCalledWith(50);
    });

    it('should handle parsing errors gracefully', async () => {
      mockSupabase.limit.mockResolvedValue({
        data: [
          { email: 'user1@example.com', cv_url: 'https://example.com/cv1.pdf' }
        ],
        error: null
      });

      mockSupabase.in.mockResolvedValue({
        data: []
      });

      const { getCVParser } = require('@/Utils/cv/parser.service');
      getCVParser.mockReturnValue({
        parseCV: jest.fn().mockRejectedValue(new Error('Parse failed'))
      });

      const response = await GET(mockRequest);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.failed).toBeGreaterThan(0);
    });

    it('should store parsed CV data', async () => {
      mockSupabase.limit.mockResolvedValue({
        data: [
          { email: 'user1@example.com', cv_url: 'https://example.com/cv1.pdf' }
        ],
        error: null
      });

      mockSupabase.in.mockResolvedValue({
        data: []
      });

      await GET(mockRequest);

      expect(mockSupabase.upsert).toHaveBeenCalled();
    });

    it('should handle database errors', async () => {
      mockSupabase.limit.mockResolvedValue({
        data: null,
        error: { message: 'Database error' }
      });

      await expect(GET(mockRequest)).rejects.toThrow();
    });
  });
});

