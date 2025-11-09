/**
 * Tests for Tracking Implicit API Route
 * Tests implicit signal tracking (109 statements)
 */

import { POST, GET } from '@/app/api/tracking/implicit/route';
import { NextRequest } from 'next/server';

jest.mock('@/Utils/supabase');

describe('Tracking Implicit API Route', () => {
  let mockRequest: NextRequest;
  let mockSupabase: any;

  beforeEach(() => {
    jest.clearAllMocks();

    mockRequest = {
      method: 'POST',
      json: jest.fn(),
      headers: new Headers({
        'x-forwarded-for': '192.168.1.1',
        'user-agent': 'Mozilla/5.0'
      })
    } as any;

    mockSupabase = {
      from: jest.fn().mockReturnThis(),
      select: jest.fn().mockReturnThis(),
      insert: jest.fn().mockResolvedValue({ error: null }),
      eq: jest.fn().mockReturnThis(),
      order: jest.fn().mockReturnThis(),
      limit: jest.fn().mockResolvedValue({
        data: [],
        error: null
      })
    };

    const { getSupabaseClient } = require('@/Utils/supabase');
    getSupabaseClient.mockReturnValue(mockSupabase);
  });

  describe('POST /api/tracking/implicit', () => {
    it('should record click signal', async () => {
      mockRequest.json.mockResolvedValue({
        jobHash: 'hash123',
        email: 'user@example.com',
        signalType: 'click',
        source: 'web'
      });

      const response = await POST(mockRequest);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.success).toBe(true);
      expect(mockSupabase.insert).toHaveBeenCalled();
    });

    it('should record open signal', async () => {
      mockRequest.json.mockResolvedValue({
        jobHash: 'hash123',
        email: 'user@example.com',
        signalType: 'open'
      });

      const response = await POST(mockRequest);

      expect(response.status).toBe(200);
    });

    it('should record dwell signal with value', async () => {
      mockRequest.json.mockResolvedValue({
        jobHash: 'hash123',
        email: 'user@example.com',
        signalType: 'dwell',
        value: 5000
      });

      const response = await POST(mockRequest);

      expect(response.status).toBe(200);
    });

    it('should record scroll signal', async () => {
      mockRequest.json.mockResolvedValue({
        jobHash: 'hash123',
        email: 'user@example.com',
        signalType: 'scroll',
        value: 50
      });

      const response = await POST(mockRequest);

      expect(response.status).toBe(200);
    });

    it('should record close signal', async () => {
      mockRequest.json.mockResolvedValue({
        jobHash: 'hash123',
        email: 'user@example.com',
        signalType: 'close'
      });

      const response = await POST(mockRequest);

      expect(response.status).toBe(200);
    });

    it('should validate required fields', async () => {
      mockRequest.json.mockResolvedValue({
        email: 'user@example.com'
        // Missing jobHash and signalType
      });

      const response = await POST(mockRequest);

      expect(response.status).toBe(400);
    });

    it('should validate signal type', async () => {
      mockRequest.json.mockResolvedValue({
        jobHash: 'hash123',
        email: 'user@example.com',
        signalType: 'invalid_signal'
      });

      const response = await POST(mockRequest);

      expect(response.status).toBe(400);
    });

    it('should extract IP address from headers', async () => {
      mockRequest.json.mockResolvedValue({
        jobHash: 'hash123',
        email: 'user@example.com',
        signalType: 'click'
      });

      await POST(mockRequest);

      expect(mockSupabase.insert).toHaveBeenCalledWith(
        expect.objectContaining({
          ip_address: '192.168.1.1'
        })
      );
    });

    it('should extract user agent from headers', async () => {
      mockRequest.json.mockResolvedValue({
        jobHash: 'hash123',
        email: 'user@example.com',
        signalType: 'click'
      });

      await POST(mockRequest);

      expect(mockSupabase.insert).toHaveBeenCalledWith(
        expect.objectContaining({
          user_agent: 'Mozilla/5.0'
        })
      );
    });

    it('should record significant dwell as feedback', async () => {
      mockRequest.json.mockResolvedValue({
        jobHash: 'hash123',
        email: 'user@example.com',
        signalType: 'dwell',
        value: 6000 // > 5000ms threshold
      });

      await POST(mockRequest);

      // Should insert twice: implicit_signals + match_logs
      expect(mockSupabase.insert).toHaveBeenCalledTimes(2);
    });

    it('should record click as feedback', async () => {
      mockRequest.json.mockResolvedValue({
        jobHash: 'hash123',
        email: 'user@example.com',
        signalType: 'click'
      });

      await POST(mockRequest);

      expect(mockSupabase.insert).toHaveBeenCalledTimes(2);
    });

    it('should handle database errors', async () => {
      mockRequest.json.mockResolvedValue({
        jobHash: 'hash123',
        email: 'user@example.com',
        signalType: 'click'
      });

      mockSupabase.insert.mockResolvedValue({
        error: { message: 'Database error' }
      });

      const response = await POST(mockRequest);

      expect(response.status).toBeGreaterThanOrEqual(500);
    });
  });

  describe('GET /api/tracking/implicit', () => {
    beforeEach(() => {
      mockRequest.method = 'GET';
      mockRequest.url = 'https://example.com/api/tracking/implicit?email=user@example.com';
    });

    it('should retrieve signal history', async () => {
      mockSupabase.limit.mockResolvedValue({
        data: [
          {
            signal_type: 'click',
            job_hash: 'hash123',
            timestamp: new Date().toISOString()
          }
        ],
        error: null
      });

      const response = await GET(mockRequest);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.success).toBe(true);
      expect(data.signals).toBeDefined();
    });

    it('should filter by signal type', async () => {
      mockRequest.url = 'https://example.com/api/tracking/implicit?email=user@example.com&signalType=click';

      await GET(mockRequest);

      expect(mockSupabase.eq).toHaveBeenCalledWith('signal_type', 'click');
    });

    it('should require email parameter', async () => {
      mockRequest.url = 'https://example.com/api/tracking/implicit';

      const response = await GET(mockRequest);

      expect(response.status).toBe(400);
    });

    it('should respect limit parameter', async () => {
      mockRequest.url = 'https://example.com/api/tracking/implicit?email=user@example.com&limit=25';

      await GET(mockRequest);

      expect(mockSupabase.limit).toHaveBeenCalledWith(25);
    });
  });
});

