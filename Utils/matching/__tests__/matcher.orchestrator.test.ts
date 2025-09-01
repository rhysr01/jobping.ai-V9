/**
 * Tests for MatcherOrchestrator
 */

import { MatcherOrchestrator } from '../matcher.orchestrator';
import { Job, UserPreferences } from '../types';
import { MATCHING_CONFIG } from '../../config/matching';

// Mock services
jest.mock('../scoring.service');
jest.mock('../ai-matching.service');
jest.mock('../fallback.service');

const MockScoringService = require('../scoring.service').ScoringService;
const MockAIMatchingService = require('../ai-matching.service').AIMatchingService;
const MockFallbackMatchingService = require('../fallback.service').FallbackMatchingService;

describe('MatcherOrchestrator', () => {
  let orchestrator: MatcherOrchestrator;
  let mockOpenAI: any;
  let mockSupabase: any;
  let mockJobs: Job[];
  let mockUser: UserPreferences;

  beforeEach(() => {
    mockOpenAI = {
      chat: {
        completions: {
          create: jest.fn()
        }
      }
    };

    mockSupabase = {
      from: jest.fn().mockReturnThis(),
      insert: jest.fn().mockResolvedValue({ data: null, error: null })
    };

    orchestrator = new MatcherOrchestrator(mockOpenAI, mockSupabase);
    
    mockJobs = [
      {
        id: 1,
        job_hash: 'hash1',
        title: 'Software Engineer',
        company: 'Tech Corp',
        job_url: 'https://example.com/job1',
        location: 'London',
        description: 'Great job for early career',
        experience_required: 'entry-level',
        work_environment: 'hybrid',
        source: 'test',
        categories: ['early-career', 'tech'],
        company_profile_url: '',
        language_requirements: ['English'],
        scrape_timestamp: new Date().toISOString(),
        original_posted_date: new Date().toISOString(),
        posted_at: new Date().toISOString(),
        last_seen_at: new Date().toISOString(),
        is_active: true,
        created_at: new Date().toISOString(),
      },
      {
        id: 2,
        job_hash: 'hash2',
        title: 'Data Analyst',
        company: 'Data Corp',
        job_url: 'https://example.com/job2',
        location: 'Berlin',
        description: 'Data analysis role',
        experience_required: 'entry-level',
        work_environment: 'remote',
        source: 'test',
        categories: ['early-career', 'data'],
        company_profile_url: '',
        language_requirements: ['English', 'German'],
        scrape_timestamp: new Date().toISOString(),
        original_posted_date: new Date().toISOString(),
        posted_at: new Date().toISOString(),
        last_seen_at: new Date().toISOString(),
        is_active: true,
        created_at: new Date().toISOString(),
      }
    ];

    mockUser = {
      email: 'test@example.com',
      career_path: 'tech',
      target_cities: ['London', 'Berlin'],
      professional_expertise: 'software development',
      work_environment: 'hybrid',
      visa_status: 'eu-citizen',
      entry_level_preference: 'entry-level',
      full_name: 'Test User'
    };

    // Mock service methods
    MockAIMatchingService.prototype.performEnhancedMatching = jest.fn();
    MockFallbackMatchingService.prototype.generateRobustFallbackMatches = jest.fn();
    MockFallbackMatchingService.prototype.generateEmergencyFallbackMatches = jest.fn();
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('generateMatchesForUser', () => {
    it('should generate matches successfully with AI', async () => {
      const aiMatches = [
        {
          job: mockJobs[0],
          match_score: 85,
          match_reason: 'Good match',
          match_quality: 'good',
          match_tags: '{"eligibility":"early-career"}',
          confidence_score: 0.8,
          scoreBreakdown: {
            overall: 85,
            eligibility: 100,
            careerPath: 80,
            location: 90,
            freshness: 70,
            confidence: 0.8
          }
        }
      ];

      MockAIMatchingService.prototype.performEnhancedMatching.mockResolvedValue(aiMatches);

      const result = await orchestrator.generateMatchesForUser(mockUser, mockJobs);

      expect(result.user).toBe('test@example.com');
      expect(result.matches).toHaveLength(1);
      expect(result.aiSuccess).toBe(true);
      expect(result.fallbackUsed).toBe(false);
      expect(result.processingTime).toBeGreaterThan(0);
      expect(result.errors).toBeUndefined();
    });

    it('should use fallback when AI fails', async () => {
      const fallbackMatches = [
        {
          job: mockJobs[1],
          match_score: 75,
          match_reason: 'Fallback match',
          match_quality: 'fair',
          match_tags: '{"eligibility":"early-career"}',
          confidence_score: 0.7,
          scoreBreakdown: {
            overall: 75,
            eligibility: 100,
            careerPath: 70,
            location: 80,
            freshness: 60,
            confidence: 0.7
          }
        }
      ];

      MockAIMatchingService.prototype.performEnhancedMatching.mockRejectedValue(new Error('AI failed'));
      MockFallbackMatchingService.prototype.generateRobustFallbackMatches.mockReturnValue(fallbackMatches);

      const result = await orchestrator.generateMatchesForUser(mockUser, mockJobs);

      expect(result.user).toBe('test@example.com');
      expect(result.matches).toHaveLength(1);
      expect(result.aiSuccess).toBe(false);
      expect(result.fallbackUsed).toBe(true);
      expect(result.processingTime).toBeGreaterThan(0);
    });

    it('should use emergency fallback when everything fails', async () => {
      const emergencyMatches = [
        {
          job: mockJobs[0],
          match_score: 30,
          match_reason: 'Recent opportunity',
          match_quality: 'fair',
          match_tags: '{"eligibility":"early-career"}',
          confidence_score: 0.5,
          scoreBreakdown: {
            overall: 30,
            eligibility: 100,
            careerPath: 30,
            location: 30,
            freshness: 30,
            confidence: 0.5
          }
        }
      ];

      MockAIMatchingService.prototype.performEnhancedMatching.mockRejectedValue(new Error('AI failed'));
      MockFallbackMatchingService.prototype.generateRobustFallbackMatches.mockImplementation(() => {
        throw new Error('Fallback failed');
      });
      MockFallbackMatchingService.prototype.generateEmergencyFallbackMatches.mockReturnValue(emergencyMatches);

      const result = await orchestrator.generateMatchesForUser(mockUser, mockJobs);

      expect(result.user).toBe('test@example.com');
      expect(result.matches).toHaveLength(1);
      expect(result.aiSuccess).toBe(false);
      expect(result.fallbackUsed).toBe(true);
      expect(result.errors).toContain('Fallback failed');
    });

    it('should handle invalid user input', async () => {
      await expect(orchestrator.generateMatchesForUser({} as UserPreferences, mockJobs))
        .rejects.toThrow('Invalid user: email is required');
    });

    it('should handle empty jobs array', async () => {
      const result = await orchestrator.generateMatchesForUser(mockUser, []);

      expect(result.user).toBe('test@example.com');
      expect(result.matches).toHaveLength(0);
      expect(result.matchCount).toBe(0);
      expect(result.errors).toContain('No jobs available for matching');
    });
  });

  describe('generateMatchesForUsers', () => {
    it('should generate matches for multiple users', async () => {
      const users = [mockUser, { ...mockUser, email: 'user2@example.com' }];
      const aiMatches = [
        {
          job: mockJobs[0],
          match_score: 85,
          match_reason: 'Good match',
          match_quality: 'good',
          match_tags: '{"eligibility":"early-career"}',
          confidence_score: 0.8,
          scoreBreakdown: {
            overall: 85,
            eligibility: 100,
            careerPath: 80,
            location: 90,
            freshness: 70,
            confidence: 0.8
          }
        }
      ];

      MockAIMatchingService.prototype.performEnhancedMatching.mockResolvedValue(aiMatches);

      const result = await orchestrator.generateMatchesForUsers(users, mockJobs);

      expect(result.size).toBe(2);
      expect(result.get('test@example.com')).toHaveLength(1);
      expect(result.get('user2@example.com')).toHaveLength(1);
    });

    it('should handle individual user failures gracefully', async () => {
      const users = [mockUser, { ...mockUser, email: 'user2@example.com' }];

      MockAIMatchingService.prototype.performEnhancedMatching
        .mockResolvedValueOnce([{ job: mockJobs[0], match_score: 85, match_reason: 'Good', match_quality: 'good', match_tags: '{}', confidence_score: 0.8, scoreBreakdown: { overall: 85, eligibility: 100, careerPath: 80, location: 90, freshness: 70, confidence: 0.8 } }])
        .mockRejectedValueOnce(new Error('User 2 failed'));

      const result = await orchestrator.generateMatchesForUsers(users, mockJobs);

      expect(result.size).toBe(2);
      expect(result.get('test@example.com')).toHaveLength(1);
      expect(result.get('user2@example.com')).toHaveLength(0);
    });
  });

  describe('generateMatchesWithStrategy', () => {
    it('should use AI-only strategy', async () => {
      const aiMatches = [
        {
          job: mockJobs[0],
          match_score: 85,
          match_reason: 'Good match',
          match_quality: 'good',
          match_tags: '{"eligibility":"early-career"}',
          confidence_score: 0.8,
          scoreBreakdown: {
            overall: 85,
            eligibility: 100,
            careerPath: 80,
            location: 90,
            freshness: 70,
            confidence: 0.8
          }
        }
      ];

      MockAIMatchingService.prototype.performEnhancedMatching.mockResolvedValue(aiMatches);

      const result = await orchestrator.generateMatchesWithStrategy(mockUser, mockJobs, 'ai_only');

      expect(result.aiSuccess).toBe(true);
      expect(result.fallbackUsed).toBe(false);
      expect(result.matches).toHaveLength(1);
    });

    it('should use fallback-only strategy', async () => {
      const fallbackMatches = [
        {
          job: mockJobs[1],
          match_score: 75,
          match_reason: 'Fallback match',
          match_quality: 'fair',
          match_tags: '{"eligibility":"early-career"}',
          confidence_score: 0.7,
          scoreBreakdown: {
            overall: 75,
            eligibility: 100,
            careerPath: 70,
            location: 80,
            freshness: 60,
            confidence: 0.7
          }
        }
      ];

      MockFallbackMatchingService.prototype.generateRobustFallbackMatches.mockReturnValue(fallbackMatches);

      const result = await orchestrator.generateMatchesWithStrategy(mockUser, mockJobs, 'fallback_only');

      expect(result.aiSuccess).toBe(false);
      expect(result.fallbackUsed).toBe(true);
      expect(result.matches).toHaveLength(1);
    });

    it('should use hybrid strategy with fallback', async () => {
      const fallbackMatches = [
        {
          job: mockJobs[1],
          match_score: 75,
          match_reason: 'Fallback match',
          match_quality: 'fair',
          match_tags: '{"eligibility":"early-career"}',
          confidence_score: 0.7,
          scoreBreakdown: {
            overall: 75,
            eligibility: 100,
            careerPath: 70,
            location: 80,
            freshness: 60,
            confidence: 0.7
          }
        }
      ];

      MockAIMatchingService.prototype.performEnhancedMatching.mockRejectedValue(new Error('AI failed'));
      MockFallbackMatchingService.prototype.generateRobustFallbackMatches.mockReturnValue(fallbackMatches);

      const result = await orchestrator.generateMatchesWithStrategy(mockUser, mockJobs, 'hybrid');

      expect(result.aiSuccess).toBe(false);
      expect(result.fallbackUsed).toBe(true);
      expect(result.matches).toHaveLength(1);
    });
  });

  describe('testMatchingComponents', () => {
    it('should test all components successfully', async () => {
      MockAIMatchingService.prototype.testConnection.mockResolvedValue(true);
      MockScoringService.prototype.calculateMatchScore.mockReturnValue({ overall: 85 });
      MockFallbackMatchingService.prototype.getStats.mockReturnValue({ maxMatches: 6 });

      const result = await orchestrator.testMatchingComponents();

      expect(result.aiConnection).toBe(true);
      expect(result.scoringService).toBe(true);
      expect(result.fallbackService).toBe(true);
      expect(result.config).toBe(true);
    });

    it('should handle component failures gracefully', async () => {
      MockAIMatchingService.prototype.testConnection.mockRejectedValue(new Error('AI failed'));
      MockScoringService.prototype.calculateMatchScore.mockImplementation(() => {
        throw new Error('Scoring failed');
      });

      const result = await orchestrator.testMatchingComponents();

      expect(result.aiConnection).toBe(false);
      expect(result.scoringService).toBe(false);
      expect(result.fallbackService).toBe(true);
      expect(result.config).toBe(true);
    });
  });

  describe('getStats', () => {
    it('should return orchestrator statistics', () => {
      const stats = orchestrator.getStats();

      expect(stats.config).toBeDefined();
      expect(stats.aiStats).toBeDefined();
      expect(stats.fallbackStats).toBeDefined();
    });
  });
});
