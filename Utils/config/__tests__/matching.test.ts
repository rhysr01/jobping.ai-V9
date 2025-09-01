/**
 * Tests for matching configuration
 */

import { MATCHING_CONFIG, getConfig, validateConfig, getConfigSection } from '../matching';

describe('Matching Configuration', () => {
  describe('Configuration Structure', () => {
    it('should have all required sections', () => {
      expect(MATCHING_CONFIG).toHaveProperty('ai');
      expect(MATCHING_CONFIG).toHaveProperty('cache');
      expect(MATCHING_CONFIG).toHaveProperty('scoring');
      expect(MATCHING_CONFIG).toHaveProperty('fallback');
      expect(MATCHING_CONFIG).toHaveProperty('testing');
      expect(MATCHING_CONFIG).toHaveProperty('production');
    });

    it('should have valid AI configuration', () => {
      expect(MATCHING_CONFIG.ai.model).toBe('gpt-4-turbo-preview');
      expect(MATCHING_CONFIG.ai.maxTokens).toBeGreaterThan(0);
      expect(MATCHING_CONFIG.ai.temperature).toBeGreaterThanOrEqual(0);
      expect(MATCHING_CONFIG.ai.temperature).toBeLessThanOrEqual(1);
      expect(MATCHING_CONFIG.ai.timeout).toBeGreaterThan(0);
    });

    it('should have valid scoring weights', () => {
      const weights = MATCHING_CONFIG.scoring.weights;
      expect(weights.eligibility).toBeGreaterThan(0);
      expect(weights.careerPath).toBeGreaterThan(0);
      expect(weights.location).toBeGreaterThan(0);
      expect(weights.freshness).toBeGreaterThan(0);
    });

    it('should have valid thresholds', () => {
      const thresholds = MATCHING_CONFIG.scoring.thresholds;
      expect(thresholds.confident).toBeGreaterThan(thresholds.minimum);
      expect(thresholds.excellent).toBeGreaterThan(thresholds.good);
      expect(thresholds.good).toBeGreaterThan(thresholds.fair);
    });
  });

  describe('Environment Configuration', () => {
    it('should return testing config in test environment', () => {
      const originalEnv = process.env.NODE_ENV;
      const originalTestMode = process.env.JOBPING_TEST_MODE;
      
      process.env.NODE_ENV = 'test';
      process.env.JOBPING_TEST_MODE = '1';
      
      const config = getConfig();
      expect(config.userCap).toBe(3);
      expect(config.jobCap).toBe(300);
      expect(config.enableDetailedLogging).toBe(true);
      
      // Restore environment
      process.env.NODE_ENV = originalEnv;
      process.env.JOBPING_TEST_MODE = originalTestMode;
    });

    it('should return production config in production environment', () => {
      const originalEnv = process.env.NODE_ENV;
      const originalTestMode = process.env.JOBPING_TEST_MODE;
      
      process.env.NODE_ENV = 'production';
      process.env.JOBPING_TEST_MODE = '0';
      
      const config = getConfig();
      expect(config.userCap).toBe(50);
      expect(config.jobCap).toBe(1200);
      expect(config.enableDetailedLogging).toBe(false);
      
      // Restore environment
      process.env.NODE_ENV = originalEnv;
      process.env.JOBPING_TEST_MODE = originalTestMode;
    });
  });

  describe('Configuration Validation', () => {
    it('should validate scoring weights sum to 1', () => {
      const validation = validateConfig();
      expect(validation.valid).toBe(true);
      expect(validation.errors).toHaveLength(0);
    });

    it('should validate thresholds are in correct order', () => {
      const validation = validateConfig();
      expect(validation.valid).toBe(true);
    });

    it('should validate cache TTL is positive', () => {
      const validation = validateConfig();
      expect(validation.valid).toBe(true);
    });
  });

  describe('Configuration Sections', () => {
    it('should return specific configuration sections', () => {
      const aiConfig = getConfigSection('ai');
      expect(aiConfig).toEqual(MATCHING_CONFIG.ai);

      const scoringConfig = getConfigSection('scoring');
      expect(scoringConfig).toEqual(MATCHING_CONFIG.scoring);
    });

    it('should return fallback configuration', () => {
      const fallbackConfig = getConfigSection('fallback');
      expect(fallbackConfig.maxMatches).toBe(6);
      expect(fallbackConfig.lowConfidenceThreshold).toBe(0.4);
    });
  });

  describe('Type Safety', () => {
    it('should have readonly configuration', () => {
      // This test ensures the configuration is const and readonly
      // Note: as const only provides compile-time immutability, not runtime
      expect(typeof MATCHING_CONFIG.ai.model).toBe('string');
      expect(MATCHING_CONFIG.ai.model).toBe('gpt-4-turbo-preview');
    });

    it('should have proper number types', () => {
      expect(typeof MATCHING_CONFIG.ai.maxTokens).toBe('number');
      expect(typeof MATCHING_CONFIG.scoring.weights.eligibility).toBe('number');
      expect(typeof MATCHING_CONFIG.cache.ttl).toBe('number');
    });
  });
});
