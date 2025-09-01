/**
 * Tests for FallbackMatchingService
 */

import { FallbackMatchingService } from '../fallback.service';
import { ScoringService } from '../scoring.service';
import { Job, UserPreferences } from '../types';
import { MATCHING_CONFIG } from '../../config/matching';

// Mock ScoringService
jest.mock('../scoring.service');
const MockScoringService = ScoringService as jest.MockedClass<typeof ScoringService>;

describe('FallbackMatchingService', () => {
  let fallbackService: FallbackMatchingService;
  let mockScoringService: jest.Mocked<ScoringService>;
  let mockJobs: Job[];
  let mockUser: UserPreferences;

  beforeEach(() => {
    mockScoringService = new MockScoringService() as jest.Mocked<ScoringService>;
    fallbackService = new FallbackMatchingService(mockScoringService);
    
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
      },
      {
        id: 3,
        job_hash: 'hash3',
        title: 'Product Manager',
        company: 'Product Corp',
        job_url: 'https://example.com/job3',
        location: 'Amsterdam',
        description: 'Product management role',
        experience_required: 'entry-level',
        work_environment: 'office',
        source: 'test',
        categories: ['early-career', 'product'],
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
      target_cities: ['London', 'Berlin'],
      professional_expertise: 'software development',
      work_environment: 'hybrid',
      visa_status: 'eu-citizen',
      entry_level_preference: 'entry-level',
      full_name: 'Test User'
    };

    // Mock scoring service methods
    mockScoringService.scoreJobsForUser.mockReturnValue([
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
      },
      {
        job: mockJobs[1],
        match_score: 75,
        match_reason: 'Decent match',
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
      },
      {
        job: mockJobs[2],
        match_score: 65,
        match_reason: 'Acceptable match',
        match_quality: 'fair',
        match_tags: '{"eligibility":"early-career"}',
        confidence_score: 0.6,
        scoreBreakdown: {
          overall: 65,
          eligibility: 100,
          careerPath: 60,
          location: 70,
          freshness: 50,
          confidence: 0.6
        }
      }
    ]);

    mockScoringService.categorizeMatches.mockReturnValue({
      confident: [
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
      ],
      promising: [
        {
          job: mockJobs[1],
          match_score: 75,
          match_reason: 'Decent match',
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
    });
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('generateRobustFallbackMatches', () => {
    it('should generate fallback matches using scoring service', () => {
      const result = fallbackService.generateRobustFallbackMatches(mockJobs, mockUser);

      expect(mockScoringService.scoreJobsForUser).toHaveBeenCalledWith(mockJobs, mockUser);
      expect(mockScoringService.categorizeMatches).toHaveBeenCalled();
      expect(result).toHaveLength(2); // confident + promising
      expect(result[0].job.id).toBe(1); // confident match first
      expect(result[1].job.id).toBe(2); // promising match second
    });

    it('should respect maxMatches configuration', () => {
      const result = fallbackService.generateRobustFallbackMatches(mockJobs, mockUser);

      expect(result.length).toBeLessThanOrEqual(MATCHING_CONFIG.fallback.maxMatches);
    });

    it('should backfill with promising matches when needed', () => {
      // Mock only confident matches
      mockScoringService.categorizeMatches.mockReturnValue({
        confident: [],
        promising: [
          {
            job: mockJobs[1],
            match_score: 75,
            match_reason: 'Decent match',
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
      });

      const result = fallbackService.generateRobustFallbackMatches(mockJobs, mockUser);

      expect(result).toHaveLength(1);
      expect(result[0].job.id).toBe(2);
    });
  });

  describe('generateMatchesByCriteria', () => {
    it('should filter by career path when specified', () => {
      const result = fallbackService.generateMatchesByCriteria(mockJobs, mockUser, {
        careerPath: true
      });

      expect(mockScoringService.scoreJobsForUser).toHaveBeenCalledWith(mockJobs, mockUser);
      expect(result.length).toBeGreaterThan(0);
    });

    it('should filter by location when specified', () => {
      const result = fallbackService.generateMatchesByCriteria(mockJobs, mockUser, {
        location: true
      });

      expect(mockScoringService.scoreJobsForUser).toHaveBeenCalledWith(mockJobs, mockUser);
      expect(result.length).toBeGreaterThan(0);
    });

    it('should filter by freshness when specified', () => {
      const result = fallbackService.generateMatchesByCriteria(mockJobs, mockUser, {
        freshness: true
      });

      expect(mockScoringService.scoreJobsForUser).toHaveBeenCalledWith(mockJobs, mockUser);
      expect(result.length).toBeGreaterThan(0);
    });

    it('should respect maxResults parameter', () => {
      const result = fallbackService.generateMatchesByCriteria(mockJobs, mockUser, {
        maxResults: 1
      });

      expect(result).toHaveLength(1);
    });
  });

  describe('generateEmergencyFallbackMatches', () => {
    it('should generate emergency matches for recent jobs', () => {
      const result = fallbackService.generateEmergencyFallbackMatches(mockJobs, mockUser);

      expect(result).toHaveLength(3);
      expect(result[0].match_reason).toBe('Recent opportunity');
      expect(result[0].confidence_score).toBe(0.5);
      expect(result[0].match_score).toBeGreaterThanOrEqual(30);
    });

    it('should respect maxEmergencyMatches configuration', () => {
      const result = fallbackService.generateEmergencyFallbackMatches(mockJobs, mockUser);

      expect(result.length).toBeLessThanOrEqual(MATCHING_CONFIG.fallback.maxEmergencyMatches);
    });

    it('should handle jobs without created_at', () => {
      const jobsWithoutDate = mockJobs.map(job => ({ ...job, created_at: undefined }));
      
      const result = fallbackService.generateEmergencyFallbackMatches(jobsWithoutDate, mockUser);

      expect(result).toHaveLength(3);
    });
  });

  describe('shouldUseFallback', () => {
    it('should return true when no AI matches', () => {
      const result = fallbackService.shouldUseFallback([], mockUser);

      expect(result).toBe(true);
    });

    it('should return true when average confidence is below threshold', () => {
      const lowConfidenceMatches = [
        {
          job: mockJobs[0],
          match_score: 50,
          match_reason: 'Low confidence match',
          match_quality: 'poor',
          match_tags: '{"eligibility":"uncertain"}',
          confidence_score: 0.3, // Below threshold
          scoreBreakdown: {
            overall: 50,
            eligibility: 70,
            careerPath: 50,
            location: 40,
            freshness: 30,
            confidence: 0.3
          }
        }
      ];

      const result = fallbackService.shouldUseFallback(lowConfidenceMatches, mockUser);

      expect(result).toBe(true);
    });

    it('should return false when average confidence is above threshold', () => {
      const highConfidenceMatches = [
        {
          job: mockJobs[0],
          match_score: 85,
          match_reason: 'High confidence match',
          match_quality: 'good',
          match_tags: '{"eligibility":"early-career"}',
          confidence_score: 0.8, // Above threshold
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

      const result = fallbackService.shouldUseFallback(highConfidenceMatches, mockUser);

      expect(result).toBe(false);
    });
  });

  describe('getStats', () => {
    it('should return fallback configuration statistics', () => {
      const stats = fallbackService.getStats();

      expect(stats.maxMatches).toBe(MATCHING_CONFIG.fallback.maxMatches);
      expect(stats.lowConfidenceThreshold).toBe(MATCHING_CONFIG.fallback.lowConfidenceThreshold);
      expect(stats.diversityFactor).toBe(MATCHING_CONFIG.fallback.diversityFactor);
      expect(stats.freshnessWeight).toBe(MATCHING_CONFIG.fallback.freshnessWeight);
      expect(stats.emergencyFallbackEnabled).toBe(MATCHING_CONFIG.fallback.emergencyFallbackEnabled);
      expect(stats.maxEmergencyMatches).toBe(MATCHING_CONFIG.fallback.maxEmergencyMatches);
    });
  });
});
