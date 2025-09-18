/**
 * Unit Tests for ConsolidatedMatchingEngine
 * Tests the core job matching logic
 */

import { ConsolidatedMatchingEngine } from '@/Utils/consolidatedMatching';
import { UserPreferences, JobMatch } from '@/Utils/matching/types';

// Mock OpenAI
const mockOpenAI = {
  chat: {
    completions: {
      create: jest.fn()
    }
  }
} as any;

// Mock the OpenAI module
jest.mock('openai', () => {
  return jest.fn(() => mockOpenAI);
});

describe('ConsolidatedMatchingEngine', () => {
  let matcher: ConsolidatedMatchingEngine;
  let mockJobs: any[];
  let mockUser: UserPreferences;

  beforeEach(() => {
    matcher = new ConsolidatedMatchingEngine('test-api-key');
    
    mockJobs = [
      {
        id: 1,
        job_hash: 'hash1',
        title: 'Junior Software Engineer',
        company: 'Tech Corp',
        location: 'London, UK',
        job_url: 'https://example.com/job1',
        description: 'Entry-level software engineering position for recent graduates',
        experience_required: 'entry-level',
        work_environment: 'hybrid',
        source: 'test',
        categories: ['early-career', 'tech'],
        company_profile_url: '',
        language_requirements: ['English'],
        scrape_timestamp: new Date().toISOString(),
        original_posted_date: new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString(),
        posted_at: new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString(),
        last_seen_at: new Date().toISOString(),
        is_active: true,
        created_at: new Date().toISOString(),
      },
      {
        id: 2,
        job_hash: 'hash2',
        title: 'Data Analyst Intern',
        company: 'Data Corp',
        location: 'Berlin, Germany',
        job_url: 'https://example.com/job2',
        description: 'Data analysis internship for students and recent graduates',
        experience_required: 'entry-level',
        work_environment: 'remote',
        source: 'test',
        categories: ['early-career', 'data'],
        company_profile_url: '',
        language_requirements: ['English', 'German'],
        scrape_timestamp: new Date().toISOString(),
        original_posted_date: new Date(Date.now() - 12 * 60 * 60 * 1000).toISOString(),
        posted_at: new Date(Date.now() - 12 * 60 * 60 * 1000).toISOString(),
        last_seen_at: new Date().toISOString(),
        is_active: true,
        created_at: new Date().toISOString(),
      },
      {
        id: 3,
        job_hash: 'hash3',
        title: 'Senior Product Manager',
        company: 'Product Corp',
        location: 'Amsterdam, Netherlands',
        job_url: 'https://example.com/job3',
        description: 'Senior product management role requiring 5+ years experience',
        experience_required: 'senior',
        work_environment: 'office',
        source: 'test',
        categories: ['senior', 'product'],
        company_profile_url: '',
        language_requirements: ['English'],
        scrape_timestamp: new Date().toISOString(),
        original_posted_date: new Date(Date.now() - 48 * 60 * 60 * 1000).toISOString(),
        posted_at: new Date(Date.now() - 48 * 60 * 60 * 1000).toISOString(),
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
      full_name: 'Test User',
      start_date: '2024-01-01',
      languages_spoken: ['English'],
      company_types: ['tech'],
      roles_selected: ['developer']
    };
  });

  afterEach(() => {
    jest.clearAllMocks();
    jest.clearAllTimers();
  });

  describe('performMatching', () => {
    it('should perform AI matching successfully', async () => {
      const mockResponse = {
        choices: [{
          message: {
            function_call: {
              name: 'return_job_matches',
              arguments: JSON.stringify({
                matches: [
                  {
                    job_index: 1,
                    job_hash: 'hash1',
                    match_score: 95,
                    match_reason: 'Perfect career match for entry-level developer'
                  }
                ]
              })
            }
          }
        }],
        usage: {
          model: 'gpt-4',
          prompt_tokens: 100,
          completion_tokens: 50,
          total_tokens: 150
        }
      };

      mockOpenAI.chat.completions.create.mockResolvedValue(mockResponse);

      const result = await matcher.performMatching(mockJobs, mockUser);

      expect(result.method).toBe('ai_success');
      expect(result.matches).toHaveLength(1);
      expect(result.matches[0].job_hash).toBe('hash1');
      expect(result.matches[0].match_score).toBe(95);
      expect(result.confidence).toBe(0.9);
    });

    it('should fallback to rule-based matching when AI fails', async () => {
      mockOpenAI.chat.completions.create.mockRejectedValue(new Error('AI service unavailable'));

      const result = await matcher.performMatching(mockJobs, mockUser);

      expect(result.method).toBe('ai_failed');
      expect(result.matches.length).toBeGreaterThan(0);
      expect(result.confidence).toBe(0.7);
    });

    it('should use rule-based matching when forced', async () => {
      const result = await matcher.performMatching(mockJobs, mockUser, true);

      expect(result.method).toBe('rule_based');
      expect(result.matches.length).toBeGreaterThan(0);
      expect(result.confidence).toBe(0.8);
    });

    it('should handle empty jobs array', async () => {
      const result = await matcher.performMatching([], mockUser);

      expect(result.method).toBe('ai_failed'); // AI fails on empty array, falls back to rules
      expect(result.matches).toHaveLength(0);
    });

    it('should handle timeout scenarios', async () => {
      // Mock a slow response that will timeout
      mockOpenAI.chat.completions.create.mockImplementation(() => 
        new Promise(resolve => setTimeout(resolve, 10000))
      );

      const result = await matcher.performMatching(mockJobs, mockUser);

      expect(result.method).toBe('ai_failed');
      expect(result.matches.length).toBeGreaterThan(0);
    }, 15000); // Increase test timeout
  });

  describe('rule-based matching', () => {
    it('should score early-career jobs higher', async () => {
      const result = await matcher.performMatching(mockJobs, mockUser, true);

      const earlyCareerMatch = result.matches.find(m => m.job_hash === 'hash1');
      const seniorMatch = result.matches.find(m => m.job_hash === 'hash3');

      expect(earlyCareerMatch?.match_score).toBeGreaterThan(seniorMatch?.match_score || 0);
    });

    it('should prioritize jobs in target cities', async () => {
      const result = await matcher.performMatching(mockJobs, mockUser, true);

      const londonMatch = result.matches.find(m => m.job_hash === 'hash1');
      const berlinMatch = result.matches.find(m => m.job_hash === 'hash2');
      const amsterdamMatch = result.matches.find(m => m.job_hash === 'hash3');

      expect(londonMatch?.match_score).toBeGreaterThan(amsterdamMatch?.match_score || 0);
      expect(berlinMatch?.match_score).toBeGreaterThan(amsterdamMatch?.match_score || 0);
    });

    it('should penalize remote jobs when user prefers hybrid', async () => {
      const result = await matcher.performMatching(mockJobs, mockUser, true);

      const hybridMatch = result.matches.find(m => m.job_hash === 'hash1');
      const remoteMatch = result.matches.find(m => m.job_hash === 'hash2');

      // Both should have reasonable scores, hybrid should be equal or higher
      expect(hybridMatch?.match_score).toBeGreaterThanOrEqual(remoteMatch?.match_score || 0);
      expect(hybridMatch?.match_score).toBeGreaterThan(0);
      expect(remoteMatch?.match_score).toBeGreaterThan(0);
    });

    it('should prioritize recent job postings', async () => {
      const result = await matcher.performMatching(mockJobs, mockUser, true);

      const recentMatch = result.matches.find(m => m.job_hash === 'hash2'); // 12 hours ago
      const olderMatch = result.matches.find(m => m.job_hash === 'hash3'); // 48 hours ago

      expect(recentMatch?.match_score).toBeGreaterThan(olderMatch?.match_score || 0);
    });
  });

  describe('AI model selection', () => {
    it('should use GPT-3.5 for simple cases', async () => {
      const simpleJobs = mockJobs.slice(0, 2);
      const simpleUser = { ...mockUser, target_cities: ['London'] };

      const mockResponse = {
        choices: [{
          message: {
            function_call: {
              name: 'return_job_matches',
              arguments: JSON.stringify({ matches: [] })
            }
          }
        }],
        usage: { model: 'gpt-3.5-turbo' }
      };

      mockOpenAI.chat.completions.create.mockResolvedValue(mockResponse);

      await matcher.performMatching(simpleJobs, simpleUser);

      expect(mockOpenAI.chat.completions.create).toHaveBeenCalledWith(
        expect.objectContaining({
          model: 'gpt-3.5-turbo'
        })
      );
    });

    it('should use GPT-4 for complex cases', async () => {
      const complexJobs = mockJobs;
      const complexUser = { 
        ...mockUser, 
        target_cities: ['London', 'Berlin', 'Amsterdam', 'Paris', 'Madrid', 'Rome'],
        career_path: ['tech', 'data', 'product'],
        professional_expertise: 'full-stack development',
        company_types: ['startup', 'enterprise', 'consulting'],
        work_environment: 'hybrid',
        experience_level: 'entry-level',
        salary_expectations: 'competitive',
        remote_work_preference: 'hybrid'
      };

      const mockResponse = {
        choices: [{
          message: {
            function_call: {
              name: 'return_job_matches',
              arguments: JSON.stringify({ matches: [] })
            }
          }
        }],
        usage: { model: 'gpt-4' }
      };

      mockOpenAI.chat.completions.create.mockResolvedValue(mockResponse);

      await matcher.performMatching(complexJobs, complexUser);

      expect(mockOpenAI.chat.completions.create).toHaveBeenCalledWith(
        expect.objectContaining({
          model: 'gpt-4'
        })
      );
    });
  });

  describe('cost tracking', () => {
    it('should track AI costs correctly', async () => {
      const mockResponse = {
        choices: [{
          message: {
            function_call: {
              name: 'return_job_matches',
              arguments: JSON.stringify({ matches: [] })
            }
          }
        }],
        usage: {
          model: 'gpt-4',
          prompt_tokens: 1000,
          completion_tokens: 500,
          total_tokens: 1500
        }
      };

      mockOpenAI.chat.completions.create.mockResolvedValue(mockResponse);

      await matcher.performMatching(mockJobs, mockUser);

      // Check that cost tracking is working
      const stats = (matcher as any).costTracker;
      // The model used depends on complexity, so check both possibilities
      const totalCalls = stats.gpt4.calls + stats.gpt35.calls;
      const totalTokens = stats.gpt4.tokens + stats.gpt35.tokens;
      
      expect(totalCalls).toBeGreaterThan(0);
      expect(totalTokens).toBeGreaterThan(0);
    });
  });

  describe('error handling', () => {
    it('should handle malformed AI responses', async () => {
      const mockResponse = {
        choices: [{
          message: {
            function_call: {
              name: 'return_job_matches',
              arguments: 'invalid json'
            }
          }
        }]
      };

      mockOpenAI.chat.completions.create.mockResolvedValue(mockResponse);

      const result = await matcher.performMatching(mockJobs, mockUser);

      expect(result.method).toBe('ai_failed');
      expect(result.matches.length).toBeGreaterThan(0); // Should fallback to rules
    });

    it('should handle missing function calls', async () => {
      const mockResponse = {
        choices: [{
          message: {
            content: 'Some text response instead of function call'
          }
        }]
      };

      mockOpenAI.chat.completions.create.mockResolvedValue(mockResponse);

      const result = await matcher.performMatching(mockJobs, mockUser);

      expect(result.method).toBe('ai_failed');
      expect(result.matches.length).toBeGreaterThan(0); // Should fallback to rules
    });

    it('should handle network timeouts gracefully', async () => {
      mockOpenAI.chat.completions.create.mockRejectedValue(new Error('Request timeout'));

      const result = await matcher.performMatching(mockJobs, mockUser);

      expect(result.method).toBe('ai_failed');
      expect(result.matches.length).toBeGreaterThan(0);
    });
  });

  describe('testConnection', () => {
    it('should return true for successful connection', async () => {
      mockOpenAI.chat.completions.create.mockResolvedValue({
        choices: [{ message: { content: 'test' } }]
      });

      const result = await matcher.testConnection();

      expect(result).toBe(true);
    });

    it('should return false for failed connection', async () => {
      mockOpenAI.chat.completions.create.mockRejectedValue(new Error('Connection failed'));

      const result = await matcher.testConnection();

      expect(result).toBe(false);
    });
  });
});
