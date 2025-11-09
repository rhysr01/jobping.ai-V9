/**
 * Tests for Engagement Tracker
 * Tests user engagement tracking and email delivery logic
 */

import {
  isUserEngaged,
  updateUserEngagement,
  getReEngagementCandidates,
  markReEngagementSent,
  getEngagementStats,
  shouldSendEmailToUser,
  getEngagedUsersForDelivery,
  resetUserEngagement
} from '@/Utils/engagementTracker';
import { getDatabaseClient } from '@/Utils/databasePool';

// Mock database pool
jest.mock('@/Utils/databasePool', () => ({
  getDatabaseClient: jest.fn()
}));

describe('Engagement Tracker', () => {
  let mockSupabase: any;

  beforeEach(() => {
    jest.clearAllMocks();
    
    mockSupabase = {
      from: jest.fn().mockReturnThis(),
      select: jest.fn().mockReturnThis(),
      update: jest.fn().mockReturnThis(),
      eq: jest.fn().mockReturnThis(),
      gte: jest.fn().mockReturnThis(),
      single: jest.fn(),
      rpc: jest.fn()
    };

    (getDatabaseClient as jest.Mock).mockReturnValue(mockSupabase);
  });

  describe('isUserEngaged', () => {
    it('should return true for engaged user', async () => {
      const thirtyDaysAgo = new Date();
      thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 15); // 15 days ago

      mockSupabase.single.mockResolvedValue({
        data: {
          email_engagement_score: 50,
          delivery_paused: false,
          last_engagement_date: thirtyDaysAgo.toISOString()
        },
        error: null
      });

      const result = await isUserEngaged('user@example.com');

      expect(result).toBe(true);
      expect(mockSupabase.from).toHaveBeenCalledWith('users');
      expect(mockSupabase.eq).toHaveBeenCalledWith('email', 'user@example.com');
    });

    it('should return false for user with low engagement score', async () => {
      mockSupabase.single.mockResolvedValue({
        data: {
          email_engagement_score: 20,
          delivery_paused: false,
          last_engagement_date: new Date().toISOString()
        },
        error: null
      });

      const result = await isUserEngaged('user@example.com');

      expect(result).toBe(false);
    });

    it('should return false for paused user', async () => {
      mockSupabase.single.mockResolvedValue({
        data: {
          email_engagement_score: 50,
          delivery_paused: true,
          last_engagement_date: new Date().toISOString()
        },
        error: null
      });

      const result = await isUserEngaged('user@example.com');

      expect(result).toBe(false);
    });

    it('should return false for user with old engagement', async () => {
      const fortyDaysAgo = new Date();
      fortyDaysAgo.setDate(fortyDaysAgo.getDate() - 40);

      mockSupabase.single.mockResolvedValue({
        data: {
          email_engagement_score: 50,
          delivery_paused: false,
          last_engagement_date: fortyDaysAgo.toISOString()
        },
        error: null
      });

      const result = await isUserEngaged('user@example.com');

      expect(result).toBe(false);
    });

    it('should return false when user not found', async () => {
      mockSupabase.single.mockResolvedValue({
        data: null,
        error: { message: 'User not found' }
      });

      const result = await isUserEngaged('user@example.com');

      expect(result).toBe(false);
    });

    it('should return false when database error occurs', async () => {
      mockSupabase.single.mockResolvedValue({
        data: null,
        error: { message: 'Database error' }
      });

      const result = await isUserEngaged('user@example.com');

      expect(result).toBe(false);
    });
  });

  describe('updateUserEngagement', () => {
    it('should update engagement for email_opened', async () => {
      mockSupabase.rpc.mockResolvedValue({ error: null });

      await updateUserEngagement('user@example.com', 'email_opened');

      expect(mockSupabase.rpc).toHaveBeenCalledWith('update_user_engagement', {
        user_email: 'user@example.com',
        engagement_type: 'email_opened'
      });
    });

    it('should update engagement for email_clicked', async () => {
      mockSupabase.rpc.mockResolvedValue({ error: null });

      await updateUserEngagement('user@example.com', 'email_clicked');

      expect(mockSupabase.rpc).toHaveBeenCalledWith('update_user_engagement', {
        user_email: 'user@example.com',
        engagement_type: 'email_clicked'
      });
    });

    it('should update engagement for email_sent', async () => {
      mockSupabase.rpc.mockResolvedValue({ error: null });

      await updateUserEngagement('user@example.com', 'email_sent');

      expect(mockSupabase.rpc).toHaveBeenCalledWith('update_user_engagement', {
        user_email: 'user@example.com',
        engagement_type: 'email_sent'
      });
    });

    it('should handle database errors gracefully', async () => {
      mockSupabase.rpc.mockResolvedValue({
        error: { message: 'Database error' }
      });

      // Should not throw
      await expect(updateUserEngagement('user@example.com', 'email_opened')).resolves.not.toThrow();
    });
  });

  describe('getReEngagementCandidates', () => {
    it('should return re-engagement candidates', async () => {
      const mockCandidates = [
        {
          email: 'user1@example.com',
          full_name: 'User 1',
          email_engagement_score: 20,
          delivery_paused: false,
          last_engagement_date: null,
          last_email_opened: null,
          last_email_clicked: null,
          re_engagement_sent: false
        }
      ];

      mockSupabase.rpc.mockResolvedValue({
        data: mockCandidates,
        error: null
      });

      const result = await getReEngagementCandidates();

      expect(result).toEqual(mockCandidates);
      expect(mockSupabase.rpc).toHaveBeenCalledWith('get_users_for_re_engagement');
    });

    it('should return empty array on error', async () => {
      mockSupabase.rpc.mockResolvedValue({
        data: null,
        error: { message: 'Database error' }
      });

      const result = await getReEngagementCandidates();

      expect(result).toEqual([]);
    });
  });

  describe('markReEngagementSent', () => {
    it('should mark re-engagement as sent', async () => {
      mockSupabase.eq.mockResolvedValue({ error: null });

      await markReEngagementSent('user@example.com');

      expect(mockSupabase.from).toHaveBeenCalledWith('users');
      expect(mockSupabase.update).toHaveBeenCalledWith({ re_engagement_sent: true });
      expect(mockSupabase.eq).toHaveBeenCalledWith('email', 'user@example.com');
    });

    it('should handle errors gracefully', async () => {
      mockSupabase.eq.mockResolvedValue({
        error: { message: 'Database error' }
      });

      await expect(markReEngagementSent('user@example.com')).resolves.not.toThrow();
    });
  });

  describe('getEngagementStats', () => {
    it('should return engagement statistics', async () => {
      // Mock total users query
      mockSupabase.eq.mockResolvedValueOnce({
        data: [{ email: 'user1@example.com' }, { email: 'user2@example.com' }],
        error: null
      });

      // Mock engaged users query
      mockSupabase.eq.mockResolvedValueOnce({
        data: [{ email: 'user1@example.com' }],
        error: null
      });

      // Mock paused users query
      mockSupabase.eq.mockResolvedValueOnce({
        data: [],
        error: null
      });

      // Mock re-engagement candidates
      mockSupabase.rpc.mockResolvedValue({
        data: [{ email: 'user2@example.com' }],
        error: null
      });

      const stats = await getEngagementStats();

      expect(stats.total_users).toBe(2);
      expect(stats.engaged_users).toBe(1);
      expect(stats.paused_users).toBe(0);
      expect(stats.re_engagement_candidates).toBe(1);
    });

    it('should handle errors and return zero stats', async () => {
      mockSupabase.eq.mockResolvedValue({
        data: null,
        error: { message: 'Database error' }
      });

      const stats = await getEngagementStats();

      expect(stats.total_users).toBe(0);
      expect(stats.engaged_users).toBe(0);
      expect(stats.paused_users).toBe(0);
      expect(stats.re_engagement_candidates).toBe(0);
    });
  });

  describe('shouldSendEmailToUser', () => {
    it('should return true for eligible user', async () => {
      const thirtyDaysAgo = new Date();
      thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 15);

      mockSupabase.single.mockResolvedValueOnce({
        data: {
          delivery_paused: false,
          email_engagement_score: 50,
          last_engagement_date: thirtyDaysAgo.toISOString()
        },
        error: null
      });

      mockSupabase.single.mockResolvedValueOnce({
        data: {
          email_engagement_score: 50,
          delivery_paused: false,
          last_engagement_date: thirtyDaysAgo.toISOString()
        },
        error: null
      });

      const result = await shouldSendEmailToUser('user@example.com');

      expect(result).toBe(true);
    });

    it('should return false for paused user', async () => {
      mockSupabase.single.mockResolvedValue({
        data: {
          delivery_paused: true,
          email_engagement_score: 50,
          last_engagement_date: new Date().toISOString()
        },
        error: null
      });

      const result = await shouldSendEmailToUser('user@example.com');

      expect(result).toBe(false);
    });

    it('should return false when user not found', async () => {
      mockSupabase.single.mockResolvedValue({
        data: null,
        error: { message: 'User not found' }
      });

      const result = await shouldSendEmailToUser('user@example.com');

      expect(result).toBe(false);
    });
  });

  describe('getEngagedUsersForDelivery', () => {
    it('should return list of engaged user emails', async () => {
      mockSupabase.gte.mockResolvedValue({
        data: [
          { email: 'user1@example.com' },
          { email: 'user2@example.com' }
        ],
        error: null
      });

      const result = await getEngagedUsersForDelivery();

      expect(result).toEqual(['user1@example.com', 'user2@example.com']);
      expect(mockSupabase.from).toHaveBeenCalledWith('users');
      expect(mockSupabase.eq).toHaveBeenCalledWith('active', true);
      expect(mockSupabase.eq).toHaveBeenCalledWith('email_verified', true);
      expect(mockSupabase.eq).toHaveBeenCalledWith('delivery_paused', false);
      expect(mockSupabase.gte).toHaveBeenCalledWith('email_engagement_score', 30);
    });

    it('should return empty array on error', async () => {
      mockSupabase.gte.mockResolvedValue({
        data: null,
        error: { message: 'Database error' }
      });

      const result = await getEngagedUsersForDelivery();

      expect(result).toEqual([]);
    });
  });

  describe('resetUserEngagement', () => {
    beforeEach(() => {
      process.env.NODE_ENV = 'test';
    });

    afterEach(() => {
      delete process.env.NODE_ENV;
    });

    it('should reset engagement in test environment', async () => {
      mockSupabase.eq.mockResolvedValue({ error: null });

      await resetUserEngagement('user@example.com');

      expect(mockSupabase.update).toHaveBeenCalledWith(
        expect.objectContaining({
          email_engagement_score: 100,
          delivery_paused: false,
          re_engagement_sent: false
        })
      );
    });

    it('should not reset in production', async () => {
      process.env.NODE_ENV = 'production';

      await resetUserEngagement('user@example.com');

      expect(mockSupabase.update).not.toHaveBeenCalled();
    });

    it('should handle errors gracefully', async () => {
      mockSupabase.eq.mockResolvedValue({
        error: { message: 'Database error' }
      });

      await expect(resetUserEngagement('user@example.com')).resolves.not.toThrow();
    });
  });
});

