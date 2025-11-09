/**
 * Tests for Feedback Enhanced API Route
 * Tests enhanced feedback collection (73 statements)
 */

import { POST, GET } from '@/app/api/feedback/enhanced/route';
import { NextRequest } from 'next/server';

jest.mock('@/Utils/supabase');

describe('Feedback Enhanced API Route', () => {
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
      insert: jest.fn().mockReturnThis(),
      eq: jest.fn().mockReturnThis(),
      order: jest.fn().mockReturnThis(),
      limit: jest.fn().mockResolvedValue({
        data: [],
        error: null
      }),
      single: jest.fn().mockResolvedValue({
        data: { id: 1, title: 'Job' },
        error: null
      })
    };

    const { getSupabaseClient } = require('@/Utils/supabase');
    getSupabaseClient.mockReturnValue(mockSupabase);
  });

  describe('POST /api/feedback/enhanced', () => {
    it('should record enhanced feedback', async () => {
      mockRequest.json.mockResolvedValue({
        jobHash: 'hash123',
        email: 'user@example.com',
        feedbackType: 'thumbs_up',
        verdict: 'positive',
        relevanceScore: 5,
        source: 'web'
      });

      mockSupabase.insert.mockResolvedValue({ error: null });

      const response = await POST(mockRequest);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.success).toBe(true);
    });

    it('should validate required fields', async () => {
      mockRequest.json.mockResolvedValue({
        email: 'user@example.com'
        // Missing jobHash and feedbackType
      });

      const response = await POST(mockRequest);

      expect(response.status).toBe(400);
    });

    it('should validate feedback type', async () => {
      mockRequest.json.mockResolvedValue({
        jobHash: 'hash123',
        email: 'user@example.com',
        feedbackType: 'invalid_type'
      });

      const response = await POST(mockRequest);

      expect(response.status).toBe(400);
    });

    it('should infer verdict from feedback type', async () => {
      mockRequest.json.mockResolvedValue({
        jobHash: 'hash123',
        email: 'user@example.com',
        feedbackType: 'save'
        // No verdict provided
      });

      mockSupabase.insert.mockResolvedValue({ error: null });

      const response = await POST(mockRequest);

      expect(response.status).toBe(200);
    });

    it('should record dwell time', async () => {
      mockRequest.json.mockResolvedValue({
        jobHash: 'hash123',
        email: 'user@example.com',
        feedbackType: 'dwell',
        dwellTimeMs: 5000
      });

      mockSupabase.insert.mockResolvedValue({ error: null });

      const response = await POST(mockRequest);

      expect(response.status).toBe(200);
    });

    it('should handle database errors', async () => {
      mockRequest.json.mockResolvedValue({
        jobHash: 'hash123',
        email: 'user@example.com',
        feedbackType: 'thumbs_up'
      });

      mockSupabase.insert.mockResolvedValue({
        error: { message: 'Database error' }
      });

      const response = await POST(mockRequest);

      expect(response.status).toBeGreaterThanOrEqual(500);
    });
  });

  describe('GET /api/feedback/enhanced', () => {
    beforeEach(() => {
      mockRequest.method = 'GET';
      mockRequest.url = 'https://example.com/api/feedback/enhanced?email=user@example.com&limit=50';
    });

    it('should retrieve user feedback history', async () => {
      mockSupabase.limit.mockResolvedValue({
        data: [
          {
            id: 1,
            user_email: 'user@example.com',
            job_hash: 'hash123',
            feedback_type: 'thumbs_up'
          }
        ],
        error: null
      });

      const response = await GET(mockRequest);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.success).toBe(true);
      expect(data.feedback).toBeDefined();
    });

    it('should require email parameter', async () => {
      mockRequest.url = 'https://example.com/api/feedback/enhanced';

      const response = await GET(mockRequest);

      expect(response.status).toBe(400);
    });

    it('should respect limit parameter', async () => {
      mockRequest.url = 'https://example.com/api/feedback/enhanced?email=user@example.com&limit=25';

      await GET(mockRequest);

      expect(mockSupabase.limit).toHaveBeenCalledWith(25);
    });
  });
});

