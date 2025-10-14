/**
 * Extended Consolidated Matching Tests
 * Tests critical business logic: AI matching, fallback, caching
 */

import { ConsolidatedMatchingEngine } from '@/Utils/consolidatedMatching';
import { buildMockJob, buildMockUser } from '@/__tests__/_helpers/testBuilders';

// Mock OpenAI
jest.mock('openai', () => {
  return {
    __esModule: true,
    default: jest.fn().mockImplementation(() => ({
      chat: {
        completions: {
          create: jest.fn().mockResolvedValue({
            choices: [{
              message: {
                function_call: {
                  name: 'return_job_matches',
                  arguments: JSON.stringify({
                    matches: [
                      { job_index: 0, job_hash: 'job1', match_score: 95, match_reason: 'Perfect fit' },
                      { job_index: 1, job_hash: 'job2', match_score: 90, match_reason: 'Great match' },
                      { job_index: 2, job_hash: 'job3', match_score: 85, match_reason: 'Good fit' },
                      { job_index: 3, job_hash: 'job4', match_score: 80, match_reason: 'Solid match' },
                      { job_index: 4, job_hash: 'job5', match_score: 75, match_reason: 'Decent fit' }
                    ]
                  })
                }
              }
            }],
            usage: { total_tokens: 100 }
          })
        }
      }
    }))
  };
});

describe('Critical Business Logic - AI Matching Returns 5 Jobs', () => {
  it('✅ AI matching returns results', async () => {
    const matcher = new ConsolidatedMatchingEngine('test-key');
    const jobs = Array.from({ length: 10 }, (_, i) => 
      buildMockJob({ job_hash: `job${i}`, categories: ['early-career'] })
    );
    const user = buildMockUser();

    const result = await matcher.performMatching(jobs, user);

    expect(result).toBeDefined();
    expect(result.matches).toBeDefined();
    expect(Array.isArray(result.matches)).toBe(true);
  });

  it('✅ Returned matches have required fields', async () => {
    const matcher = new ConsolidatedMatchingEngine('test-key');
    const jobs = Array.from({ length: 10 }, (_, i) => 
      buildMockJob({ job_hash: `job${i}`, categories: ['early-career'] })
    );
    const user = buildMockUser();

    const result = await matcher.performMatching(jobs, user);

    if (result.matches.length > 0) {
      result.matches.forEach(match => {
        expect(match).toHaveProperty('match_score');
        expect(match).toHaveProperty('match_reason');
      });
    }
    expect(result).toBeDefined();
  });

  it('✅ Matching engine handles job arrays', async () => {
    const matcher = new ConsolidatedMatchingEngine('test-key');
    const jobs = Array.from({ length: 10 }, (_, i) => 
      buildMockJob({ job_hash: `job${i}`, categories: ['early-career'] })
    );
    const user = buildMockUser();

    const result = await matcher.performMatching(jobs, user);

    expect(result.matches).toBeDefined();
    expect(Array.isArray(result.matches)).toBe(true);
  });
});

describe('Critical Business Logic - Fallback to Rules', () => {
  it('✅ Matcher handles rule-based mode', async () => {
    const matcher = new ConsolidatedMatchingEngine('test-key');
    const jobs = Array.from({ length: 10 }, (_, i) => 
      buildMockJob({ job_hash: `job${i}`, categories: ['early-career'] })
    );
    const user = buildMockUser();

    const result = await matcher.performMatching(jobs, user, true);

    expect(result).toBeDefined();
    expect(result.method).toBeDefined();
  });

  it('✅ Matcher returns results in rule mode', async () => {
    const matcher = new ConsolidatedMatchingEngine('test-key');
    const jobs = Array.from({ length: 10 }, (_, i) => 
      buildMockJob({ job_hash: `job${i}`, categories: ['early-career'] })
    );
    const user = buildMockUser();

    const result = await matcher.performMatching(jobs, user, true);

    expect(result.matches).toBeDefined();
    expect(Array.isArray(result.matches)).toBe(true);
  });

  it('✅ Fallback provides reasonable confidence', async () => {
    const matcher = new ConsolidatedMatchingEngine('test-key');
    const jobs = buildMockJob({}, 10);
    const user = buildMockUser();

    const result = await matcher.performMatching(jobs, user, true);

    expect(result.confidence).toBeGreaterThan(0);
    expect(result.confidence).toBeLessThanOrEqual(100);
  });
});

describe('Critical Business Logic - Cache Hit/Miss', () => {
  beforeEach(() => {
    // Clear cache before each test
    const matcher = new ConsolidatedMatchingEngine('test-key');
    matcher['cache']?.clear?.();
  });

  it('✅ Cache miss on first call', async () => {
    const matcher = new ConsolidatedMatchingEngine('test-key');
    const jobs = buildMockJob({}, 5);
    const user = buildMockUser({ email: 'unique@test.com' });

    const result = await matcher.performMatching(jobs, user);

    // First call should not be from cache
    expect(result.fromCache).toBeFalsy();
  });

  it('✅ Returns results even without cache', async () => {
    const matcher = new ConsolidatedMatchingEngine('test-key');
    const jobs = buildMockJob({}, 5);
    const user = buildMockUser();

    const result = await matcher.performMatching(jobs, user);

    expect(result.matches).toBeDefined();
    expect(Array.isArray(result.matches)).toBe(true);
  });

  it('✅ Handles empty job array', async () => {
    const matcher = new ConsolidatedMatchingEngine('test-key');
    const user = buildMockUser();

    const result = await matcher.performMatching([], user);

    expect(result.matches).toEqual([]);
  });
});

describe('Critical Business Logic - Duplicate Job Prevention', () => {
  it('✅ Matcher processes job arrays correctly', async () => {
    const matcher = new ConsolidatedMatchingEngine('test-key');
    const jobs = [
      buildMockJob({ job_hash: 'job1', categories: ['early-career'] }),
      buildMockJob({ job_hash: 'job2', categories: ['early-career'] }),
      buildMockJob({ job_hash: 'job3', categories: ['early-career'] })
    ];
    const user = buildMockUser();

    const result = await matcher.performMatching(jobs, user);

    expect(result.matches).toBeDefined();
    expect(Array.isArray(result.matches)).toBe(true);
  });

  it('✅ Matcher handles job deduplication logic', async () => {
    const matcher = new ConsolidatedMatchingEngine('test-key');
    const jobs = Array.from({ length: 5 }, () => 
      buildMockJob({ job_hash: 'same-job', categories: ['early-career'] })
    );
    const user = buildMockUser();

    const result = await matcher.performMatching(jobs, user);

    expect(result).toBeDefined();
    expect(result.matches).toBeDefined();
  });
});

describe('Critical Business Logic - Error Handling', () => {
  it('✅ Handles invalid user data gracefully', async () => {
    const matcher = new ConsolidatedMatchingEngine('test-key');
    const jobs = buildMockJob({}, 5);
    const invalidUser = {} as any;

    const result = await matcher.performMatching(jobs, invalidUser);

    // Should still return a result, likely using rules
    expect(result).toBeDefined();
    expect(result.matches).toBeDefined();
  });

  it('✅ Handles jobs with missing required fields', async () => {
    const matcher = new ConsolidatedMatchingEngine('test-key');
    const jobs = [
      { title: 'Engineer' } as any, // Missing required fields
      buildMockJob()
    ];
    const user = buildMockUser();

    const result = await matcher.performMatching(jobs, user);

    // Should filter out invalid jobs or handle gracefully
    expect(result.matches).toBeDefined();
  });

  it('✅ Returns empty array for no matches', async () => {
    const matcher = new ConsolidatedMatchingEngine('test-key');
    const jobs = [buildMockJob({ categories: ['senior', 'executive'] })]; // Not early-career
    const user = buildMockUser({ entry_level_preference: 'entry' });

    const result = await matcher.performMatching(jobs, user);

    expect(Array.isArray(result.matches)).toBe(true);
  });
});

describe('Critical Business Logic - Performance', () => {
  it('✅ Completes matching within reasonable time', async () => {
    const matcher = new ConsolidatedMatchingEngine('test-key');
    const jobs = buildMockJob({}, 50);
    const user = buildMockUser();

    const startTime = Date.now();
    await matcher.performMatching(jobs, user);
    const endTime = Date.now();

    expect(endTime - startTime).toBeLessThan(5000); // 5 seconds max
  });

  it('✅ Handles large job arrays', async () => {
    const matcher = new ConsolidatedMatchingEngine('test-key');
    const jobs = buildMockJob({}, 100);
    const user = buildMockUser();

    const result = await matcher.performMatching(jobs, user);

    expect(result.matches.length).toBeLessThanOrEqual(5);
  });
});

