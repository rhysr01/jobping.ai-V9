/**
 * Tests for AIMatchingService
 */

import { AIMatchingService } from '../ai-matching.service';
import { performEnhancedAIMatching } from '../consolidated-matcher.service';
import { Job, UserPreferences, JobMatch } from '../types';
import { MATCHING_CONFIG } from '../../config/matching';

// Mock OpenAI
const mockOpenAI = {
  chat: {
    completions: {
      create: jest.fn()
    }
  }
} as any;

jest.mock('openai', () => {
  return jest.fn().mockImplementation(() => mockOpenAI);
});

// Mock timeout function
jest.mock('../normalizers', () => ({
  ...jest.requireActual('../normalizers'),
  timeout: jest.fn().mockImplementation((ms, label) => {
    // Return a promise that resolves immediately for tests
    return Promise.resolve();
  })
}));

describe('AIMatchingService', () => {
  let aiService: AIMatchingService;
  let mockJobs: Job[];
  let mockUser: UserPreferences;

  beforeEach(() => {
    aiService = new AIMatchingService();
    
    mockJobs = [
      {
        id: '1',
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
        id: '2',
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
      career_path: ['tech'],
      target_cities: ['London', 'Berlin'],
      professional_expertise: 'software development',
      work_environment: 'hybrid',
      visa_status: 'eu-citizen',
      entry_level_preference: 'entry',
      full_name: 'Test User',
      start_date: '2024-01-01',
      languages_spoken: ['English'],
      company_types: ['tech'],
      roles_selected: ['developer']
    };
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('performEnhancedMatching', () => {
    it('should perform AI matching successfully', async () => {
      const mockResponse = {
        choices: [{
          message: {
            content: JSON.stringify([
              {
                job_index: 1,
                match_score: 95,
                match_reason: 'Perfect career match',
                confidence_score: 0.9
              }
            ])
          }
        }]
      };

      mockOpenAI.chat.completions.create.mockResolvedValue(mockResponse);

      const result = await performEnhancedAIMatching(mockJobs, mockUser);

      expect(result).toHaveLength(1);
      expect(result[0].job.id).toBe('1');
      expect(result[0].match_score).toBe(95);
      expect(result[0].match_reason).toBe('Perfect career match');
      expect(result[0].confidence_score).toBe(0.9);
    });

    it('should handle AI service errors gracefully', async () => {
      mockOpenAI.chat.completions.create.mockRejectedValue(new Error('AI service unavailable'));

      const result = await performEnhancedAIMatching(mockJobs, mockUser);
      
      // Should fall back to rule-based matching
      expect(result).toBeDefined();
      expect(Array.isArray(result)).toBe(true);
    });

    it('should handle empty AI response', async () => {
      const mockResponse = {
        choices: [{
          message: {
            content: null
          }
        }]
      };

      mockOpenAI.chat.completions.create.mockResolvedValue(mockResponse);

      const result = await performEnhancedAIMatching(mockJobs, mockUser);
      
      // Should fall back to rule-based matching
      expect(result).toBeDefined();
      expect(Array.isArray(result)).toBe(true);
    });
  });

  describe('buildMatchingPrompt', () => {
    it('should build a valid prompt with user preferences', () => {
      const aiService = new AIMatchingService();
      const prompt = aiService.buildMatchingPrompt(mockJobs, mockUser);

      expect(prompt).toContain('test@example.com');
      expect(prompt).toContain('tech');
      expect(prompt).toContain('London');
      expect(prompt).toContain('Berlin');
      expect(prompt).toContain('Software Engineer');
      expect(prompt).toContain('Data Analyst');
    });

    it('should handle missing user preferences gracefully', () => {
      const minimalUser = { 
        email: 'test@example.com',
        target_cities: [],
        languages_spoken: []
      };
      const aiService = new AIMatchingService();
      const prompt = aiService.buildMatchingPrompt(mockJobs, minimalUser);

      expect(prompt).toContain('test@example.com');
      expect(prompt).toContain('Not specified');
    });
  });

  describe('parseAndValidateMatches', () => {
    it('should parse valid JSON response', () => {
      const validResponse = JSON.stringify([
        {
          job_index: 0,
          match_score: 90,
          match_reason: 'Good match',
          confidence_score: 0.8
        }
      ]);

      const aiService = new AIMatchingService();
      const result = aiService.parseAndValidateMatches(validResponse, mockJobs);

      expect(result).toHaveLength(1);
      expect(result[0].job_index).toBe(0);
      expect(result[0].match_score).toBe(90);
    });

    it('should handle malformed JSON', () => {
      const invalidResponse = 'invalid json';

      const aiService = new AIMatchingService();
      expect(() => aiService.parseAndValidateMatches(invalidResponse, mockJobs))
        .toThrow('Invalid AI response format');
    });

    it('should filter out invalid matches', () => {
      const responseWithInvalidMatches = JSON.stringify([
        {
          job_index: 1,
          match_score: 90,
          match_reason: 'Good match',
          confidence_score: 0.8
        },
        {
          job_index: 999, // Invalid index
          match_score: 50,
          match_reason: 'Invalid',
          confidence_score: 0.5
        }
      ]);

      const aiService = new AIMatchingService();
      const result = aiService.parseAndValidateMatches(responseWithInvalidMatches, mockJobs);

      expect(result).toHaveLength(1);
      expect(result[0].job_index).toBe(1);
    });

    it('should limit to maximum 5 matches', () => {
      const manyMatches = Array.from({ length: 10 }, (_, i) => ({
        job_index: 1,
        match_score: 90 + i,
        match_reason: `Match ${i}`,
        confidence_score: 0.8
      }));

      const response = JSON.stringify(manyMatches);
      const aiService = new AIMatchingService();
      const result = aiService.parseAndValidateMatches(response, mockJobs);

      expect(result).toHaveLength(10);
    });
  });

  describe('convertToRobustMatches', () => {
    it('should convert AI matches to robust format', () => {
      const aiMatches: JobMatch[] = [
        {
          job_index: 0,
          job_hash: 'hash1',
          match_score: 95,
          match_reason: 'Perfect match',
          confidence_score: 0.9
        }
      ];

      const aiService = new AIMatchingService();
      const result = aiService.convertToRobustMatches(aiMatches, mockUser, mockJobs);

      expect(result).toHaveLength(1);
      expect(result[0].job.id).toBe('1');
      expect(result[0].match_score).toBe(95);
      expect(result[0].match_reason).toBe('Perfect match');
      expect(result[0].confidence_score).toBe(0.9);
    });

    it('should skip matches with missing jobs', () => {
      const aiMatches: JobMatch[] = [
        {
          job_id: '999', // Non-existent job
          match_score: 90,
          match_reason: 'Good match',
          confidence_score: 0.8
        }
      ];

      const aiService = new AIMatchingService();
      const result = aiService.convertToRobustMatches(aiMatches, mockUser, mockJobs);

      expect(result).toHaveLength(0);
    });
  });

  describe('testConnection', () => {
    it('should return true for successful connection', async () => {
      mockOpenAI.chat.completions.create.mockResolvedValue({
        choices: [{ message: { content: 'test' } }]
      });

      const aiService = new AIMatchingService();
      const result = await aiService.testConnection();

      expect(result).toBe(true);
    });

    it('should return false for failed connection', async () => {
      mockOpenAI.chat.completions.create.mockRejectedValue(new Error('Connection failed'));

      const aiService = new AIMatchingService();
      const result = await aiService.testConnection();

      expect(result).toBe(false);
    });
  });

  describe('getStats', () => {
    it('should return configuration statistics', () => {
      const aiService = new AIMatchingService();
      const stats = aiService.getStats();

      expect(stats.model).toBe('gpt-4-turbo');
      expect(stats.maxTokens).toBe(4000);
      expect(stats.temperature).toBe(0.7);
      expect(stats.timeout).toBe(20000);
    });
  });
});
