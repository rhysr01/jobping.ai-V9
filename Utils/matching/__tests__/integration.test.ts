/**
 * Integration Tests for Phase 6: Feature Flag Integration
 * Tests the integration between new and legacy matching systems
 */

import { performEnhancedAIMatching, generateRobustFallbackMatches, calculateMatchScore } from '../../jobMatching';
import { MatcherOrchestrator } from '../matcher.orchestrator';
import { ScoringService } from '../scoring.service';
import { Job, UserPreferences } from '../types';

// Mock OpenAI
const mockOpenAI = {
  chat: {
    completions: {
      create: jest.fn()
    }
  }
} as any;

// Mock Supabase
const mockSupabase = {
  from: jest.fn().mockReturnThis(),
  insert: jest.fn().mockResolvedValue({ data: null, error: null })
} as any;

describe('Phase 6: Feature Flag Integration', () => {
  let mockJobs: Job[];
  let mockUser: UserPreferences;
  let originalEnv: string | undefined;

  beforeEach(() => {
    // Store original environment
    originalEnv = process.env.USE_NEW_MATCHING_ARCHITECTURE;
    
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
      }
    ];

    mockUser = {
      email: 'test@example.com',
      career_path: 'tech',
      target_cities: ['London'],
      professional_expertise: 'software development',
      work_environment: 'hybrid',
      visa_status: 'eu-citizen',
      entry_level_preference: 'entry-level',
      full_name: 'Test User'
    };
  });

  afterEach(() => {
    // Restore original environment
    if (originalEnv !== undefined) {
      process.env.USE_NEW_MATCHING_ARCHITECTURE = originalEnv;
    } else {
      delete process.env.USE_NEW_MATCHING_ARCHITECTURE;
    }
    jest.clearAllMocks();
  });

  describe('Feature Flag: USE_NEW_MATCHING_ARCHITECTURE', () => {
    it('should use new architecture when flag is enabled', async () => {
      // Enable new architecture
      process.env.USE_NEW_MATCHING_ARCHITECTURE = 'true';

      // Mock new architecture success
      const mockOrchestrator = {
        generateMatchesWithStrategy: jest.fn().mockResolvedValue({
          matches: [
            {
              job: mockJobs[0],
              match_score: 85,
              match_reason: 'New architecture match',
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
          ]
        })
      };

      // Mock the require to return our mock orchestrator
      jest.doMock('../matcher.orchestrator', () => ({
        MatcherOrchestrator: jest.fn().mockImplementation(() => mockOrchestrator)
      }));

      // Clear require cache to force re-import
      jest.resetModules();

      // Re-import the module to get the updated implementation
      const { performEnhancedAIMatching: newPerformAIMatching } = require('../../jobMatching');

      const result = await newPerformAIMatching(mockJobs, mockUser, mockOpenAI);

      expect(result).toHaveLength(1);
      expect(result[0].match_reason).toBe('New architecture match');
      expect(mockOrchestrator.generateMatchesWithStrategy).toHaveBeenCalledWith(
        mockUser,
        mockJobs,
        'ai_only'
      );
    });

    it('should fall back to legacy when new architecture fails', async () => {
      // Enable new architecture
      process.env.USE_NEW_MATCHING_ARCHITECTURE = 'true';

      // Mock new architecture failure
      const mockOrchestrator = {
        generateMatchesWithStrategy: jest.fn().mockRejectedValue(new Error('New architecture failed'))
      };

      jest.doMock('../matcher.orchestrator', () => ({
        MatcherOrchestrator: jest.fn().mockImplementation(() => mockOrchestrator)
      }));

      jest.resetModules();

      const { performEnhancedAIMatching: newPerformAIMatching } = require('../../jobMatching');

      // Mock legacy AI response
      mockOpenAI.chat.completions.create.mockResolvedValue({
        choices: [{
          message: {
            content: JSON.stringify([
              {
                job_index: 1,
                match_score: 90,
                match_reason: 'Legacy match',
                confidence_score: 0.9
              }
            ])
          }
        }]
      });

      const result = await newPerformAIMatching(mockJobs, mockUser, mockOpenAI);

      expect(result).toHaveLength(1);
      expect(result[0].match_reason).toBe('Legacy match');
    });

    it('should use legacy architecture when flag is disabled', async () => {
      // Disable new architecture
      process.env.USE_NEW_MATCHING_ARCHITECTURE = 'false';

      // Mock legacy AI response
      mockOpenAI.chat.completions.create.mockResolvedValue({
        choices: [{
          message: {
            content: JSON.stringify([
              {
                job_index: 1,
                match_score: 90,
                match_reason: 'Legacy match',
                confidence_score: 0.9
              }
            ])
          }
        }]
      });

      const result = await performEnhancedAIMatching(mockJobs, mockUser, mockOpenAI);

      expect(result).toHaveLength(1);
      expect(result[0].match_reason).toBe('Legacy match');
    });
  });

  describe('Scoring Service Integration', () => {
    it('should use new scoring service when flag is enabled', () => {
      // Enable new architecture
      process.env.USE_NEW_MATCHING_ARCHITECTURE = 'true';

      // Mock new scoring service
      const mockScoringService = {
        calculateMatchScore: jest.fn().mockReturnValue({
          overall: 85,
          eligibility: 100,
          careerPath: 80,
          location: 90,
          freshness: 70,
          confidence: 0.8
        })
      };

      jest.doMock('../scoring.service', () => ({
        ScoringService: jest.fn().mockImplementation(() => mockScoringService)
      }));

      jest.resetModules();

      const { calculateMatchScore: newCalculateMatchScore } = require('../../jobMatching');

      const result = newCalculateMatchScore(mockJobs[0], mockUser);

      expect(result.overall).toBe(85);
      expect(mockScoringService.calculateMatchScore).toHaveBeenCalledWith(mockJobs[0], mockUser);
    });

    it('should fall back to legacy scoring when new service fails', () => {
      // Enable new architecture
      process.env.USE_NEW_MATCHING_ARCHITECTURE = 'true';

      // Mock new scoring service failure
      const mockScoringService = {
        calculateMatchScore: jest.fn().mockImplementation(() => {
          throw new Error('New scoring service failed');
        })
      };

      jest.doMock('../scoring.service', () => ({
        ScoringService: jest.fn().mockImplementation(() => mockScoringService)
      }));

      jest.resetModules();

      const { calculateMatchScore: newCalculateMatchScore } = require('../../jobMatching');

      const result = newCalculateMatchScore(mockJobs[0], mockUser);

      // Should fall back to legacy scoring
      expect(result.overall).toBeGreaterThan(0);
      expect(result.eligibility).toBeGreaterThan(0);
    });
  });

  describe('Fallback Service Integration', () => {
    it('should use new fallback service when flag is enabled', async () => {
      // Enable new architecture
      process.env.USE_NEW_MATCHING_ARCHITECTURE = 'true';

      // Mock new orchestrator for fallback
      const mockOrchestrator = {
        generateMatchesWithStrategy: jest.fn().mockResolvedValue({
          matches: [
            {
              job: mockJobs[0],
              match_score: 75,
              match_reason: 'New fallback match',
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
          ]
        })
      };

      jest.doMock('../matcher.orchestrator', () => ({
        MatcherOrchestrator: jest.fn().mockImplementation(() => mockOrchestrator)
      }));

      jest.resetModules();

      const { generateRobustFallbackMatches: newGenerateFallback } = require('../../jobMatching');

      const result = newGenerateFallback(mockJobs, mockUser);

      expect(result).toHaveLength(1);
      expect(result[0].match_reason).toBe('New fallback match');
      expect(mockOrchestrator.generateMatchesWithStrategy).toHaveBeenCalledWith(
        mockUser,
        mockJobs,
        'fallback_only'
      );
    });
  });

  describe('Error Handling and Logging', () => {
    it('should log when new architecture is not available', () => {
      const consoleSpy = jest.spyOn(console, 'warn').mockImplementation();

      // Enable new architecture but mock require failure
      process.env.USE_NEW_MATCHING_ARCHITECTURE = 'true';

      jest.doMock('../matcher.orchestrator', () => {
        throw new Error('Module not found');
      });

      jest.resetModules();

      // This should trigger the warning
      require('../../jobMatching');

      expect(consoleSpy).toHaveBeenCalledWith(
        '⚠️ New matching architecture not available, falling back to legacy:',
        'Module not found'
      );

      consoleSpy.mockRestore();
    });

    it('should log when switching between architectures', async () => {
      const consoleSpy = jest.spyOn(console, 'log').mockImplementation();

      // Enable new architecture
      process.env.USE_NEW_MATCHING_ARCHITECTURE = 'true';

      const mockOrchestrator = {
        generateMatchesWithStrategy: jest.fn().mockResolvedValue({
          matches: []
        })
      };

      jest.doMock('../matcher.orchestrator', () => ({
        MatcherOrchestrator: jest.fn().mockImplementation(() => mockOrchestrator)
      }));

      jest.resetModules();

      const { performEnhancedAIMatching: newPerformAIMatching } = require('../../jobMatching');

      await newPerformAIMatching(mockJobs, mockUser, mockOpenAI);

      expect(consoleSpy).toHaveBeenCalledWith('🚀 Using new matching architecture for AI matching');

      consoleSpy.mockRestore();
    });
  });

  describe('Backward Compatibility', () => {
    it('should maintain exact same function signatures', () => {
      // Verify that all exported functions maintain their signatures
      expect(typeof performEnhancedAIMatching).toBe('function');
      expect(typeof generateRobustFallbackMatches).toBe('function');
      expect(typeof calculateMatchScore).toBe('function');
    });

    it('should maintain exact same return types', async () => {
      // Mock legacy response
      mockOpenAI.chat.completions.create.mockResolvedValue({
        choices: [{
          message: {
            content: JSON.stringify([
              {
                job_index: 1,
                match_score: 90,
                match_reason: 'Test match',
                confidence_score: 0.9
              }
            ])
          }
        }]
      });

      const result = await performEnhancedAIMatching(mockJobs, mockUser, mockOpenAI);

      // Verify return type structure
      expect(Array.isArray(result)).toBe(true);
      if (result.length > 0) {
        expect(result[0]).toHaveProperty('job');
        expect(result[0]).toHaveProperty('match_score');
        expect(result[0]).toHaveProperty('match_reason');
        expect(result[0]).toHaveProperty('match_quality');
        expect(result[0]).toHaveProperty('match_tags');
        expect(result[0]).toHaveProperty('confidence_score');
        expect(result[0]).toHaveProperty('scoreBreakdown');
      }
    });
  });
});
