import {
  SEND_PLAN,
  MATCH_RULES,
  canUserReceiveSend,
  shouldSkipSend,
  getCurrentWeekStart,
  type SendPlan,
  type MatchRules,
  type SendLedgerEntry,
} from '@/Utils/sendConfiguration';

describe('sendConfiguration', () => {
  describe('SEND_PLAN', () => {
    it('should have free plan configuration', () => {
      expect(SEND_PLAN.free).toBeDefined();
      expect(SEND_PLAN.free.days).toEqual(['Thu']);
      expect(SEND_PLAN.free.perSend).toBe(5);
      expect(SEND_PLAN.free.pullsPerWeek).toBe(1);
      expect(SEND_PLAN.free.signupBonus).toBe(10);
    });

    it('should have premium plan configuration', () => {
      expect(SEND_PLAN.premium).toBeDefined();
      expect(SEND_PLAN.premium.days).toEqual(['Mon', 'Wed', 'Fri']);
      expect(SEND_PLAN.premium.perSend).toBe(5);
      expect(SEND_PLAN.premium.pullsPerWeek).toBe(3);
      expect(SEND_PLAN.premium.signupBonus).toBe(10);
      expect(SEND_PLAN.premium.earlyAccessHours).toBe(24);
    });
  });

  describe('MATCH_RULES', () => {
    it('should have match quality rules', () => {
      expect(MATCH_RULES.minScore).toBeGreaterThan(0);
      expect(MATCH_RULES.lookbackDays).toBeGreaterThan(0);
      expect(MATCH_RULES.maxPerCompanyPerSend).toBeGreaterThan(0);
      expect(MATCH_RULES.maxPerSource).toBeGreaterThan(0);
    });

    it('should have reasonable threshold values', () => {
      expect(MATCH_RULES.minScore).toBeGreaterThanOrEqual(50);
      expect(MATCH_RULES.minScore).toBeLessThanOrEqual(100);
      expect(MATCH_RULES.lookbackDays).toBeLessThanOrEqual(90);
    });
  });

  describe('canUserReceiveSend', () => {
    it('should allow send for new week', () => {
      const ledger: SendLedgerEntry = {
        user_id: 'user1',
        week_start: '2024-01-01',
        tier: 'free',
        sends_used: 1,
        jobs_sent: 5,
      };
      const currentWeek = '2024-01-08';
      expect(canUserReceiveSend(ledger, currentWeek, 'free')).toBe(true);
    });

    it('should allow send when under limit', () => {
      const ledger: SendLedgerEntry = {
        user_id: 'user1',
        week_start: '2024-01-01',
        tier: 'free',
        sends_used: 0,
        jobs_sent: 0,
      };
      const currentWeek = '2024-01-01';
      expect(canUserReceiveSend(ledger, currentWeek, 'free')).toBe(true);
    });

    it('should deny send when at limit', () => {
      const ledger: SendLedgerEntry = {
        user_id: 'user1',
        week_start: '2024-01-01',
        tier: 'free',
        sends_used: 1,
        jobs_sent: 5,
      };
      const currentWeek = '2024-01-01';
      expect(canUserReceiveSend(ledger, currentWeek, 'free')).toBe(false);
    });

    it('should allow premium users more sends', () => {
      const ledger: SendLedgerEntry = {
        user_id: 'user1',
        week_start: '2024-01-01',
        tier: 'premium',
        sends_used: 2,
        jobs_sent: 10,
      };
      const currentWeek = '2024-01-01';
      expect(canUserReceiveSend(ledger, currentWeek, 'premium')).toBe(true);
    });

    it('should deny premium users when at limit', () => {
      const ledger: SendLedgerEntry = {
        user_id: 'user1',
        week_start: '2024-01-01',
        tier: 'premium',
        sends_used: 3,
        jobs_sent: 15,
      };
      const currentWeek = '2024-01-01';
      expect(canUserReceiveSend(ledger, currentWeek, 'premium')).toBe(false);
    });
  });

  describe('shouldSkipSend', () => {
    it('should skip when insufficient jobs for free tier', () => {
      const jobs = Array(4).fill({}); // Less than 5
      expect(shouldSkipSend(jobs, 'free')).toBe(true);
    });

    it('should not skip when sufficient jobs for free tier', () => {
      const jobs = Array(5).fill({}); // Exactly 5
      expect(shouldSkipSend(jobs, 'free')).toBe(false);
    });

    it('should skip when insufficient jobs for premium tier', () => {
      const jobs = Array(4).fill({}); // Less than 5
      expect(shouldSkipSend(jobs, 'premium')).toBe(true);
    });

    it('should not skip when sufficient jobs for premium tier', () => {
      const jobs = Array(5).fill({}); // Exactly 5
      expect(shouldSkipSend(jobs, 'premium')).toBe(false);
    });
  });

  describe('getCurrentWeekStart', () => {
    it('should return Monday date', () => {
      const weekStart = getCurrentWeekStart();
      expect(weekStart).toBeDefined();
      expect(typeof weekStart).toBe('string');
    });

    it('should return valid ISO date string', () => {
      const weekStart = getCurrentWeekStart();
      const date = new Date(weekStart);
      expect(date.getTime()).toBeGreaterThan(0);
    });

    it('should return Monday for any day of week', () => {
      const weekStart = getCurrentWeekStart();
      const date = new Date(weekStart);
      const dayOfWeek = date.getDay();
      expect(dayOfWeek).toBe(1); // Monday is 1
    });
  });
});

