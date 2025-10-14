/**
 * Tests for Copy/Marketing Strings
 */

import * as Copy from '@/lib/copy';

describe('Copy Strings', () => {
  describe('CTAs', () => {
    it('should have clear call to action text', () => {
      expect(Copy.CTA_FREE).toBeDefined();
      expect(Copy.CTA_FREE.length).toBeGreaterThan(5);
      expect(Copy.CTA_FREE.length).toBeLessThan(50);
    });

    it('should mention premium in premium CTA', () => {
      expect(Copy.CTA_PREMIUM.toLowerCase()).toContain('premium');
    });
  });

  describe('Value Proposition', () => {
    it('should have clear value proposition', () => {
      expect(Copy.VP_TAGLINE).toBeDefined();
      expect(Copy.VP_TAGLINE.length).toBeGreaterThan(20);
    });
  });

  describe('Hero Section', () => {
    it('should have brand name', () => {
      expect(Copy.HERO_TITLE).toBe('JobPing');
    });
  });

  describe('How It Works', () => {
    it('should have 3 clear steps', () => {
      expect(Copy.HOW_IT_WORKS_STEPS).toHaveLength(3);
    });

    it('should have title and description for each step', () => {
      Copy.HOW_IT_WORKS_STEPS.forEach(step => {
        expect(step).toHaveProperty('title');
        expect(step).toHaveProperty('description');
      });
    });
  });

  describe('Pricing Plans', () => {
    it('should list free plan features', () => {
      expect(Copy.FREE_PLAN_FEATURES).toBeDefined();
      expect(Copy.FREE_PLAN_FEATURES.length).toBeGreaterThan(3);
    });

    it('should list premium plan features', () => {
      expect(Copy.PREMIUM_PLAN_FEATURES).toBeDefined();
      expect(Copy.PREMIUM_PLAN_FEATURES.length).toBeGreaterThan(3);
    });

    it('should have premium plan price in euros', () => {
      expect(Copy.PREMIUM_PLAN_PRICE).toContain('€');
    });
  });

  describe('Reassurance Items', () => {
    it('should have at least 3 reassurance items', () => {
      expect(Copy.REASSURANCE_ITEMS.length).toBeGreaterThanOrEqual(3);
    });
  });
});

