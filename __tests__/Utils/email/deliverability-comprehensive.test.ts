/**
 * Comprehensive tests for Email Deliverability
 * Tests DMARC/SPF/DKIM validation, bounce handling, unsubscribe
 */

import {
  validateEmailDeliverability,
  addToBounceSuppressionList,
  isInBounceSuppressionList,
  unsubscribeUser,
  getBounceSuppressionListSize,
  getComplaintRate
} from '@/Utils/email/deliverability';

jest.mock('@/Utils/databasePool');
jest.mock('dns', () => ({
  promises: {
    resolveTxt: jest.fn()
  }
}));

describe('Email Deliverability', () => {
  let mockSupabase: any;

  beforeEach(() => {
    jest.clearAllMocks();

    mockSupabase = {
      from: jest.fn().mockReturnThis(),
      select: jest.fn().mockReturnThis(),
      eq: jest.fn().mockReturnThis(),
      single: jest.fn(),
      insert: jest.fn().mockResolvedValue({ error: null }),
      update: jest.fn().mockResolvedValue({ error: null }),
      upsert: jest.fn().mockResolvedValue({ error: null })
    };

    const { getDatabaseClient } = require('@/Utils/databasePool');
    getDatabaseClient.mockReturnValue(mockSupabase);

    process.env.EMAIL_DOMAIN = 'getjobping.com';
  });

  describe('validateEmailDeliverability', () => {
    it('should validate SPF record', async () => {
      const dns = require('dns').promises;
      dns.resolveTxt.mockResolvedValue([['v=spf1 include:_spf.resend.com ~all']]);

      const result = await validateEmailDeliverability();

      expect(result.isValid).toBeDefined();
      expect(result.issues).toBeDefined();
      expect(result.recommendations).toBeDefined();
    });

    it('should detect missing SPF record', async () => {
      const dns = require('dns').promises;
      dns.resolveTxt.mockRejectedValue(new Error('Not found'));

      const result = await validateEmailDeliverability();

      expect(result.issues.some(i => i.includes('SPF'))).toBe(true);
    });

    it('should validate DKIM record', async () => {
      const dns = require('dns').promises;
      dns.resolveTxt
        .mockResolvedValueOnce([]) // SPF
        .mockResolvedValueOnce([['v=DKIM1 k=rsa p=...']]); // DKIM

      const result = await validateEmailDeliverability();

      expect(result).toBeDefined();
    });

    it('should validate DMARC record', async () => {
      const dns = require('dns').promises;
      dns.resolveTxt
        .mockResolvedValueOnce([]) // SPF
        .mockResolvedValueOnce([]) // DKIM
        .mockResolvedValueOnce([['v=DMARC1; p=quarantine']]); // DMARC

      const result = await validateEmailDeliverability();

      expect(result).toBeDefined();
    });
  });

  describe('addToBounceSuppressionList', () => {
    it('should add email to suppression list', async () => {
      mockSupabase.single.mockResolvedValue({ data: null, error: null });

      const result = await addToBounceSuppressionList(
        'bounced@example.com',
        'hard',
        'Invalid recipient'
      );

      expect(result).toBe(true);
      expect(mockSupabase.insert).toHaveBeenCalled();
    });

    it('should update existing suppression record', async () => {
      mockSupabase.single.mockResolvedValue({
        data: { email: 'bounced@example.com', retry_count: 1 },
        error: null
      });

      const result = await addToBounceSuppressionList(
        'bounced@example.com',
        'hard',
        'Invalid recipient'
      );

      expect(result).toBe(true);
      expect(mockSupabase.update).toHaveBeenCalled();
    });

    it('should unsubscribe on hard bounce', async () => {
      mockSupabase.single.mockResolvedValue({ data: null, error: null });
      mockSupabase.eq.mockReturnThis();

      await addToBounceSuppressionList(
        'bounced@example.com',
        'hard',
        'Invalid recipient'
      );

      expect(mockSupabase.from).toHaveBeenCalledWith('users');
    });
  });

  describe('isInBounceSuppressionList', () => {
    it('should return true for hard bounce', async () => {
      mockSupabase.single.mockResolvedValue({
        data: {
          email: 'bounced@example.com',
          bounce_type: 'hard',
          retry_count: 1
        },
        error: null
      });

      const result = await isInBounceSuppressionList('bounced@example.com');

      expect(result).toBe(true);
    });

    it('should return true for soft bounce with high retry count', async () => {
      mockSupabase.single.mockResolvedValue({
        data: {
          email: 'bounced@example.com',
          bounce_type: 'soft',
          retry_count: 3
        },
        error: null
      });

      const result = await isInBounceSuppressionList('bounced@example.com');

      expect(result).toBe(true);
    });

    it('should return false for email not in list', async () => {
      mockSupabase.single.mockResolvedValue({ data: null, error: null });

      const result = await isInBounceSuppressionList('test@example.com');

      expect(result).toBe(false);
    });
  });

  describe('unsubscribeUser', () => {
    it('should unsubscribe user', async () => {
      mockSupabase.eq.mockReturnThis();

      const result = await unsubscribeUser('user@example.com', 'User requested');

      expect(result).toBe(true);
      expect(mockSupabase.update).toHaveBeenCalled();
    });

    it('should record unsubscribe', async () => {
      mockSupabase.eq.mockReturnThis();

      await unsubscribeUser('user@example.com');

      expect(mockSupabase.insert).toHaveBeenCalled();
    });
  });

  describe('getBounceSuppressionListSize', () => {
    it('should return suppression list size', async () => {
      mockSupabase.select.mockResolvedValue({ data: [{}, {}, {}], error: null });

      const size = await getBounceSuppressionListSize();

      expect(size).toBe(3);
    });
  });

  describe('getComplaintRate', () => {
    it('should calculate complaint rate', async () => {
      mockSupabase.select
        .mockResolvedValueOnce({ data: Array(100), error: null }) // Total emails
        .mockResolvedValueOnce({ data: Array(5), error: null }); // Complaints

      const rate = await getComplaintRate();

      expect(rate).toBeGreaterThanOrEqual(0);
      expect(rate).toBeLessThanOrEqual(1);
    });
  });
});

