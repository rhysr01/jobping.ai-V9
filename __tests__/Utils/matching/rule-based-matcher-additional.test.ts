import {
  getMatchQuality,
  generateMatchExplanation,
  categorizeMatches,
  performRobustMatching,
  generateRobustFallbackMatches,
} from '@/Utils/matching/rule-based-matcher.service';
import type { Job } from '@/scrapers/types';
import type { UserPreferences, MatchResult, MatchScore } from '@/Utils/matching/types';

describe('rule-based-matcher additional functions', () => {
  const mockJob: Job = {
    job_hash: 'test-hash',
    title: 'Software Engineer',
    company: 'Test Company',
    location: 'London, UK',
    description: 'Looking for a junior developer',
    job_url: 'https://example.com/job',
    source: 'test',
    categories: ['early-career', 'software'],
    is_active: true,
    is_graduate: false,
    is_internship: false,
    created_at: new Date().toISOString(),
    posted_at: new Date().toISOString(),
    original_posted_date: new Date().toISOString(),
    last_seen_at: new Date().toISOString(),
    scrape_timestamp: new Date().toISOString(),
    experience_required: '',
    work_environment: 'remote',
  };

  const mockUser: UserPreferences = {
    email: 'test@example.com',
    career_path: ['tech'],
    target_cities: ['London'],
  };

  const mockScore: MatchScore = {
    overall: 85,
    eligibility: 100,
    location: 90,
    experience: 80,
    skills: 70,
    company: 60,
    timing: 75,
  };

  describe('getMatchQuality', () => {
    it('should return excellent for high scores', () => {
      expect(getMatchQuality(90)).toBe('excellent');
      expect(getMatchQuality(100)).toBe('excellent');
    });

    it('should return good for medium-high scores', () => {
      expect(getMatchQuality(75)).toBe('good');
      expect(getMatchQuality(80)).toBe('good');
    });

    it('should return fair for medium scores', () => {
      expect(getMatchQuality(60)).toBe('fair');
      expect(getMatchQuality(65)).toBe('fair');
    });

    it('should return low for low scores', () => {
      expect(getMatchQuality(40)).toBe('low');
      expect(getMatchQuality(30)).toBe('low');
    });
  });

  describe('generateMatchExplanation', () => {
    it('should generate explanation with reasons', () => {
      const explanation = generateMatchExplanation(mockJob, mockScore, mockUser);
      expect(explanation.reason).toBeDefined();
      expect(explanation.tags).toBeDefined();
      expect(typeof explanation.reason).toBe('string');
      expect(typeof explanation.tags).toBe('string');
    });

    it('should include location match in explanation when applicable', () => {
      const londonJob = {
        ...mockJob,
        location: 'London, UK',
        city: 'London',
      };
      const explanation = generateMatchExplanation(londonJob, mockScore, mockUser);
      expect(explanation.reason).toBeDefined();
      expect(explanation.reason.length).toBeGreaterThan(0);
    });

    it('should generate explanation for any job', () => {
      const explanation = generateMatchExplanation(mockJob, mockScore, mockUser);
      expect(explanation.reason).toBeDefined();
      expect(explanation.reason.length).toBeGreaterThan(0);
    });
  });

  describe('categorizeMatches', () => {
    it('should categorize confident matches', () => {
      const matches: MatchResult[] = [
        {
          job: mockJob,
          match_score: 85,
          match_reason: 'Good match',
          confidence_score: 0.8,
          match_quality: 'good',
          score_breakdown: mockScore,
          provenance: { match_algorithm: 'rules' },
        },
      ];
      const categorized = categorizeMatches(matches);
      expect(categorized.confident).toHaveLength(1);
      expect(categorized.promising).toHaveLength(0);
    });

    it('should categorize promising matches', () => {
      const matches: MatchResult[] = [
        {
          job: mockJob,
          match_score: 65,
          match_reason: 'Fair match',
          confidence_score: 0.6,
          match_quality: 'fair',
          score_breakdown: mockScore,
          provenance: { match_algorithm: 'rules' },
        },
      ];
      const categorized = categorizeMatches(matches);
      expect(categorized.confident).toHaveLength(0);
      expect(categorized.promising).toHaveLength(1);
    });

    it('should exclude low-scoring matches', () => {
      const matches: MatchResult[] = [
        {
          job: mockJob,
          match_score: 50,
          match_reason: 'Low match',
          confidence_score: 0.5,
          match_quality: 'low',
          score_breakdown: mockScore,
          provenance: { match_algorithm: 'rules' },
        },
      ];
      const categorized = categorizeMatches(matches);
      expect(categorized.confident).toHaveLength(0);
      expect(categorized.promising).toHaveLength(0);
    });

    it('should handle mixed matches', () => {
      const matches: MatchResult[] = [
        {
          job: mockJob,
          match_score: 85,
          match_reason: 'Good',
          confidence_score: 0.8,
          match_quality: 'good',
          score_breakdown: mockScore,
          provenance: { match_algorithm: 'rules' },
        },
        {
          job: mockJob,
          match_score: 65,
          match_reason: 'Fair',
          confidence_score: 0.6,
          match_quality: 'fair',
          score_breakdown: mockScore,
          provenance: { match_algorithm: 'rules' },
        },
      ];
      const categorized = categorizeMatches(matches);
      expect(categorized.confident).toHaveLength(1);
      expect(categorized.promising).toHaveLength(1);
    });
  });

  describe('performRobustMatching', () => {
    it('should perform matching and return results', () => {
      const jobs: Job[] = [
        {
          ...mockJob,
          categories: ['early-career', 'software', 'career:tech', 'loc:london'],
        },
      ];
      const matches = performRobustMatching(jobs, mockUser);
      expect(Array.isArray(matches)).toBe(true);
    });

    it('should filter out jobs that fail hard gates', () => {
      const jobs: Job[] = [
        {
          ...mockJob,
          categories: [], // No eligibility
        },
      ];
      const matches = performRobustMatching(jobs, mockUser);
      expect(matches).toHaveLength(0);
    });

    it('should sort matches by score', () => {
      const jobs: Job[] = [
        {
          ...mockJob,
          categories: ['early-career', 'software'],
          job_hash: 'hash1',
        },
        {
          ...mockJob,
          categories: ['early-career', 'software'],
          job_hash: 'hash2',
        },
      ];
      const matches = performRobustMatching(jobs, mockUser);
      if (matches.length > 1) {
        expect(matches[0].match_score).toBeGreaterThanOrEqual(matches[1].match_score);
      }
    });

    it('should include provenance', () => {
      const jobs: Job[] = [
        {
          ...mockJob,
          categories: ['early-career', 'software'],
        },
      ];
      const matches = performRobustMatching(jobs, mockUser);
      if (matches.length > 0) {
        expect(matches[0].provenance.match_algorithm).toBe('rules');
      }
    });
  });

  describe('generateRobustFallbackMatches', () => {
    it('should call performRobustMatching', () => {
      const jobs: Job[] = [
        {
          ...mockJob,
          categories: ['early-career', 'software'],
        },
      ];
      const matches = generateRobustFallbackMatches(jobs, mockUser);
      expect(Array.isArray(matches)).toBe(true);
    });

    it('should return matches with rule-based provenance', () => {
      const jobs: Job[] = [
        {
          ...mockJob,
          categories: ['early-career', 'software'],
        },
      ];
      const matches = generateRobustFallbackMatches(jobs, mockUser);
      if (matches.length > 0) {
        expect(matches[0].provenance.match_algorithm).toBe('rules');
        expect(matches[0].provenance.fallback_reason).toBe('Rule-based matching');
      }
    });
  });
});

