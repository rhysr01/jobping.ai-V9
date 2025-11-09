/**
 * Comprehensive tests for Production Ready Templates
 * Tests email template generation, HTML structure, personalization
 */

import {
  createWelcomeEmail,
  createJobMatchesEmail
} from '@/Utils/email/productionReadyTemplates';

describe('Production Ready Templates', () => {
  describe('createWelcomeEmail', () => {
    it('should generate welcome email HTML', () => {
      const html = createWelcomeEmail('John Doe', 10);

      expect(html).toContain('Welcome');
      expect(html).toContain('10');
      expect(html).toContain('<!DOCTYPE html>');
    });

    it('should handle missing userName', () => {
      const html = createWelcomeEmail(undefined, 5);

      expect(html).toBeDefined();
      expect(typeof html).toBe('string');
    });

    it('should include match count', () => {
      const html = createWelcomeEmail('User', 15);

      expect(html).toContain('15');
    });
  });

  describe('createJobMatchesEmail', () => {
    it('should generate job matches email HTML', () => {
      const jobCards = [
        {
          job: {
            id: 'job1',
            title: 'Software Engineer',
            company: 'Tech Corp',
            location: 'London',
            description: 'Great opportunity',
            job_url: 'https://example.com/job1',
            user_email: 'user@example.com'
          },
          matchResult: {
            match_score: 85,
            reasoning: 'Great match'
          },
          isConfident: true,
          isPromising: true,
          hasManualLocator: false,
          searchHint: ''
        }
      ];

      const html = createJobMatchesEmail(jobCards, 'User', 'free', false);

      expect(html).toContain('Software Engineer');
      expect(html).toContain('Tech Corp');
      expect(html).toContain('<!DOCTYPE html>');
    });

    it('should handle empty job list', () => {
      const html = createJobMatchesEmail([], 'User', 'free', false);

      expect(html).toBeDefined();
    });

    it('should handle premium tier', () => {
      const jobCards = [
        {
          job: {
            id: 'job1',
            title: 'Engineer',
            company: 'Corp',
            location: 'London',
            description: 'Job',
            job_url: 'https://example.com',
            user_email: 'user@example.com'
          },
          matchResult: {
            match_score: 90,
            reasoning: 'Match'
          },
          isConfident: true,
          isPromising: true,
          hasManualLocator: false,
          searchHint: ''
        }
      ];

      const html = createJobMatchesEmail(jobCards, 'User', 'premium', false);

      expect(html).toBeDefined();
    });
  });
});

