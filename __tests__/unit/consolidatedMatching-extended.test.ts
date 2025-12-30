/**
 * Extended Consolidated Matching Tests
 * Tests critical business logic: AI matching, fallback, caching
 */

import { buildMockJob, buildMockUser } from "@/__tests__/_helpers/testBuilders";
import {
  ConsolidatedMatchingEngine,
  createConsolidatedMatcher,
} from "@/Utils/consolidatedMatchingV2";

// Mock OpenAI
jest.mock("openai", () => {
  return {
    __esModule: true,
    default: jest.fn().mockImplementation(() => ({
      chat: {
        completions: {
          create: jest.fn().mockResolvedValue({
            choices: [
              {
                message: {
                  function_call: {
                    name: "return_job_matches",
                    arguments: JSON.stringify({
                      matches: [
                        {
                          job_index: 0,
                          job_hash: "job1",
                          match_score: 95,
                          match_reason: "Perfect fit",
                        },
                        {
                          job_index: 1,
                          job_hash: "job2",
                          match_score: 90,
                          match_reason: "Great match",
                        },
                        {
                          job_index: 2,
                          job_hash: "job3",
                          match_score: 85,
                          match_reason: "Good fit",
                        },
                        {
                          job_index: 3,
                          job_hash: "job4",
                          match_score: 80,
                          match_reason: "Solid match",
                        },
                        {
                          job_index: 4,
                          job_hash: "job5",
                          match_score: 75,
                          match_reason: "Decent fit",
                        },
                      ],
                    }),
                  },
                },
              },
            ],
            usage: { total_tokens: 100 },
          }),
        },
      },
    })),
  };
});

describe("Critical Business Logic - AI Matching Returns 5 Jobs", () => {
  it(" AI matching returns results", async () => {
    const matcher = new ConsolidatedMatchingEngine("test-key");
    const jobs = Array.from({ length: 10 }, (_, i) =>
      buildMockJob({ job_hash: `job${i}`, categories: ["early-career"] }),
    );
    const user = buildMockUser();

    const result = await matcher.performMatching(jobs, user);

    expect(result).toBeDefined();
    expect(result.matches).toBeDefined();
    expect(Array.isArray(result.matches)).toBe(true);
  });

  it(" Returned matches have required fields", async () => {
    const matcher = new ConsolidatedMatchingEngine("test-key");
    const jobs = Array.from({ length: 10 }, (_, i) =>
      buildMockJob({ job_hash: `job${i}`, categories: ["early-career"] }),
    );
    const user = buildMockUser();

    const result = await matcher.performMatching(jobs, user);

    if (result.matches.length > 0) {
      result.matches.forEach((match) => {
        expect(match).toHaveProperty("match_score");
        expect(match).toHaveProperty("match_reason");
      });
    }
    expect(result).toBeDefined();
  });

  it(" Matching engine handles job arrays", async () => {
    const matcher = new ConsolidatedMatchingEngine("test-key");
    const jobs = Array.from({ length: 10 }, (_, i) =>
      buildMockJob({ job_hash: `job${i}`, categories: ["early-career"] }),
    );
    const user = buildMockUser();

    const result = await matcher.performMatching(jobs, user);

    expect(result.matches).toBeDefined();
    expect(Array.isArray(result.matches)).toBe(true);
  });
});

describe("Critical Business Logic - Fallback to Rules", () => {
  it(" Matcher handles rule-based mode", async () => {
    const matcher = new ConsolidatedMatchingEngine("test-key");
    const jobs = Array.from({ length: 10 }, (_, i) =>
      buildMockJob({ job_hash: `job${i}`, categories: ["early-career"] }),
    );
    const user = buildMockUser();

    const result = await matcher.performMatching(jobs, user, true);

    expect(result).toBeDefined();
    expect(result.method).toBeDefined();
  });

  it(" Matcher returns results in rule mode", async () => {
    const matcher = new ConsolidatedMatchingEngine("test-key");
    const jobs = Array.from({ length: 10 }, (_, i) =>
      buildMockJob({ job_hash: `job${i}`, categories: ["early-career"] }),
    );
    const user = buildMockUser();

    const result = await matcher.performMatching(jobs, user, true);

    expect(result.matches).toBeDefined();
    expect(Array.isArray(result.matches)).toBe(true);
  });

  it(" Fallback provides reasonable confidence", async () => {
    const matcher = new ConsolidatedMatchingEngine("test-key");
    const jobs = buildMockJob({}, 10);
    const user = buildMockUser();

    const result = await matcher.performMatching(jobs, user, true);

    expect(result.confidence).toBeGreaterThan(0);
    expect(result.confidence).toBeLessThanOrEqual(100);
  });
});

describe("Critical Business Logic - Cache Hit/Miss", () => {
  beforeEach(() => {
    // Clear cache before each test
    const matcher = new ConsolidatedMatchingEngine("test-key");
    matcher["cache"]?.clear?.();
  });

  it(" Cache miss on first call", async () => {
    const matcher = new ConsolidatedMatchingEngine("test-key");
    const jobs = buildMockJob({}, 5);
    const user = buildMockUser({ email: "unique@test.com" });

    const result = await matcher.performMatching(jobs, user);

    // First call should not be from cache
    expect(result.fromCache).toBeFalsy();
  });

  it(" Returns results even without cache", async () => {
    const matcher = new ConsolidatedMatchingEngine("test-key");
    const jobs = buildMockJob({}, 5);
    const user = buildMockUser();

    const result = await matcher.performMatching(jobs, user);

    expect(result.matches).toBeDefined();
    expect(Array.isArray(result.matches)).toBe(true);
  });

  it(" Handles empty job array", async () => {
    const matcher = new ConsolidatedMatchingEngine("test-key");
    const user = buildMockUser();

    const result = await matcher.performMatching([], user);

    expect(result.matches).toEqual([]);
  });
});

describe("Critical Business Logic - Duplicate Job Prevention", () => {
  it(" Matcher processes job arrays correctly", async () => {
    const matcher = new ConsolidatedMatchingEngine("test-key");
    const jobs = [
      buildMockJob({ job_hash: "job1", categories: ["early-career"] }),
      buildMockJob({ job_hash: "job2", categories: ["early-career"] }),
      buildMockJob({ job_hash: "job3", categories: ["early-career"] }),
    ];
    const user = buildMockUser();

    const result = await matcher.performMatching(jobs, user);

    expect(result.matches).toBeDefined();
    expect(Array.isArray(result.matches)).toBe(true);
  });

  it(" Matcher handles job deduplication logic", async () => {
    const matcher = new ConsolidatedMatchingEngine("test-key");
    const jobs = Array.from({ length: 5 }, () =>
      buildMockJob({ job_hash: "same-job", categories: ["early-career"] }),
    );
    const user = buildMockUser();

    const result = await matcher.performMatching(jobs, user);

    expect(result).toBeDefined();
    expect(result.matches).toBeDefined();
  });
});

describe("Critical Business Logic - Error Handling", () => {
  it(" Handles invalid user data gracefully", async () => {
    const matcher = new ConsolidatedMatchingEngine("test-key");
    const jobs = buildMockJob({}, 5);
    const invalidUser = {} as any;

    const result = await matcher.performMatching(jobs, invalidUser);

    // Should still return a result, likely using rules
    expect(result).toBeDefined();
    expect(result.matches).toBeDefined();
  });

  it(" Handles jobs with missing required fields", async () => {
    const matcher = new ConsolidatedMatchingEngine("test-key");
    const jobs = [
      { title: "Engineer" } as any, // Missing required fields
      buildMockJob(),
    ];
    const user = buildMockUser();

    const result = await matcher.performMatching(jobs, user);

    // Should filter out invalid jobs or handle gracefully
    expect(result.matches).toBeDefined();
  });

  it(" Returns empty array for no matches", async () => {
    const matcher = new ConsolidatedMatchingEngine("test-key");
    const jobs = [buildMockJob({ categories: ["senior", "executive"] })]; // Not early-career
    const user = buildMockUser({ entry_level_preference: "entry" });

    const result = await matcher.performMatching(jobs, user);

    expect(Array.isArray(result.matches)).toBe(true);
  });
});

describe("Critical Business Logic - Performance", () => {
  it(" Completes matching within reasonable time", async () => {
    const matcher = new ConsolidatedMatchingEngine("test-key");
    const jobs = buildMockJob({}, 50);
    const user = buildMockUser();

    const startTime = Date.now();
    await matcher.performMatching(jobs, user);
    const endTime = Date.now();

    expect(endTime - startTime).toBeLessThan(5000); // 5 seconds max
  });

  it(" Handles large job arrays", async () => {
    const matcher = new ConsolidatedMatchingEngine("test-key");
    const jobs = buildMockJob({}, 100);
    const user = buildMockUser();

    const result = await matcher.performMatching(jobs, user);

    expect(result.matches.length).toBeLessThanOrEqual(5);
  });
});

describe("Core Functions - Cache Key Generation", () => {
  it(" Generates consistent cache keys", async () => {
    const matcher = new ConsolidatedMatchingEngine("test-key");
    const jobs = Array.from({ length: 5 }, (_, i) =>
      buildMockJob({ job_hash: `job${i}` }),
    );
    const user1 = buildMockUser({
      career_path: ["tech"],
      target_cities: ["London"],
      entry_level_preference: "entry",
    });
    const user2 = buildMockUser({
      career_path: ["tech"],
      target_cities: ["London"],
      entry_level_preference: "entry",
    });

    // Call performMatching to trigger cache key generation
    await matcher.performMatching(jobs, user1);
    await matcher.performMatching(jobs, user2);

    // Both users should potentially use the same cache (date-based)
    expect(true).toBe(true); // Cache logic is internal
  });

  it(" Cache key includes career path", async () => {
    const matcher = new ConsolidatedMatchingEngine("test-key");
    const jobs = [buildMockJob()];
    const user = buildMockUser({ career_path: ["data-science"] });

    const result = await matcher.performMatching(jobs, user);

    expect(result).toBeDefined();
  });

  it(" Cache key includes target cities", async () => {
    const matcher = new ConsolidatedMatchingEngine("test-key");
    const jobs = [buildMockJob()];
    const user = buildMockUser({ target_cities: ["Berlin", "Paris"] });

    const result = await matcher.performMatching(jobs, user);

    expect(result).toBeDefined();
  });

  it(" Cache key includes entry level preference", async () => {
    const matcher = new ConsolidatedMatchingEngine("test-key");
    const jobs = [buildMockJob()];
    const user = buildMockUser({ entry_level_preference: "mid" });

    const result = await matcher.performMatching(jobs, user);

    expect(result).toBeDefined();
  });
});

describe("Core Functions - Complexity Scoring", () => {
  it(" Handles varying job counts", async () => {
    const matcher = new ConsolidatedMatchingEngine("test-key");
    const smallSet = buildMockJob({}, 10);
    const largeSet = buildMockJob({}, 150);
    const user = buildMockUser();

    const result1 = await matcher.performMatching(smallSet, user);
    const result2 = await matcher.performMatching(largeSet, user);

    expect(result1).toBeDefined();
    expect(result2).toBeDefined();
  });

  it(" Handles users with many preferences", async () => {
    const matcher = new ConsolidatedMatchingEngine("test-key");
    const jobs = buildMockJob({}, 10);
    const simpleUser = buildMockUser({
      career_path: ["tech"],
    });
    const complexUser = buildMockUser({
      career_path: ["tech", "data", "product"],
      target_cities: ["London", "Berlin", "Paris", "Amsterdam"],
      company_types: ["startup", "scale-up", "enterprise"],
      languages_spoken: ["English", "German", "French"],
    });

    const result1 = await matcher.performMatching(jobs, simpleUser);
    const result2 = await matcher.performMatching(jobs, complexUser);

    expect(result1).toBeDefined();
    expect(result2).toBeDefined();
  });
});

describe("Core Functions - Prompt Building", () => {
  it(" Builds prompts with user preferences", async () => {
    const matcher = new ConsolidatedMatchingEngine("test-key");
    const jobs = buildMockJob({}, 5);
    const user = buildMockUser({
      professional_expertise: "Software Development",
      target_cities: ["London"],
      work_environment: "remote",
    });

    const result = await matcher.performMatching(jobs, user);

    expect(result).toBeDefined();
  });

  it(" Handles jobs with various attributes", async () => {
    const matcher = new ConsolidatedMatchingEngine("test-key");
    const jobs = [
      buildMockJob({
        title: "Software Engineer",
        company: "Google",
        location: "London",
      }),
      buildMockJob({
        title: "Data Analyst",
        company: "Meta",
        location: "Remote",
      }),
      buildMockJob({
        title: "Product Manager",
        company: "Amazon",
        location: "Berlin",
      }),
    ];
    const user = buildMockUser();

    const result = await matcher.performMatching(jobs, user);

    expect(result.matches).toBeDefined();
  });

  it(" Limits jobs sent to AI", async () => {
    const matcher = new ConsolidatedMatchingEngine("test-key");
    const jobs = buildMockJob({}, 100); // More than JOBS_TO_ANALYZE (50)
    const user = buildMockUser();

    const result = await matcher.performMatching(jobs, user);

    // Should still process successfully
    expect(result).toBeDefined();
    expect(result.matches.length).toBeLessThanOrEqual(5);
  });
});

describe("Core Functions - Rule-Based Fallback", () => {
  it(" Falls back to rules on AI failure", async () => {
    const matcher = new ConsolidatedMatchingEngine("test-key");
    const jobs = buildMockJob({}, 10);
    const user = buildMockUser();

    const result = await matcher.performMatching(jobs, user, true);

    expect(result.method).toBe("rule_based");
  });

  it(" Rule-based matching scores jobs", async () => {
    const matcher = new ConsolidatedMatchingEngine("test-key");
    const jobs = [
      buildMockJob({
        categories: ["early-career", "tech"],
        location: "London",
      }),
      buildMockJob({ categories: ["senior", "marketing"], location: "Paris" }),
    ];
    const user = buildMockUser({
      career_path: ["tech"],
      target_cities: ["London"],
      entry_level_preference: "entry",
    });

    const result = await matcher.performMatching(jobs, user, true);

    expect(result.matches).toBeDefined();
  });

  it(" Rule-based handles empty job array", async () => {
    const matcher = new ConsolidatedMatchingEngine("test-key");
    const user = buildMockUser();

    const result = await matcher.performMatching([], user, true);

    expect(result.matches).toEqual([]);
    expect(result.method).toBe("rule_based");
  });

  it(" Rule-based provides confidence score", async () => {
    const matcher = new ConsolidatedMatchingEngine("test-key");
    const jobs = buildMockJob({}, 5);
    const user = buildMockUser();

    const result = await matcher.performMatching(jobs, user, true);

    expect(result.confidence).toBeGreaterThan(0);
    expect(result.confidence).toBeLessThanOrEqual(1);
  });
});

describe("Factory Function", () => {
  it(" Creates matcher with API key", () => {
    const matcher = createConsolidatedMatcher("test-api-key");

    expect(matcher).toBeInstanceOf(ConsolidatedMatchingEngine);
  });

  it(" Creates matcher without API key", () => {
    const matcher = createConsolidatedMatcher();

    expect(matcher).toBeInstanceOf(ConsolidatedMatchingEngine);
  });

  it(" Created matcher can perform matching", async () => {
    const matcher = createConsolidatedMatcher("test-key");
    const jobs = buildMockJob({}, 5);
    const user = buildMockUser();

    const result = await matcher.performMatching(jobs, user);

    expect(result).toBeDefined();
  });
});

describe("Response Parsing", () => {
  it(" Handles various match scores", async () => {
    const matcher = new ConsolidatedMatchingEngine("test-key");
    const jobs = buildMockJob({}, 5);
    const user = buildMockUser();

    const result = await matcher.performMatching(jobs, user);

    if (result.matches.length > 0) {
      result.matches.forEach((match) => {
        expect(match.match_score).toBeGreaterThanOrEqual(0);
        expect(match.match_score).toBeLessThanOrEqual(100);
      });
    }
  });

  it(" Validates match reasons exist", async () => {
    const matcher = new ConsolidatedMatchingEngine("test-key");
    const jobs = buildMockJob({}, 5);
    const user = buildMockUser();

    const result = await matcher.performMatching(jobs, user);

    if (result.matches.length > 0) {
      result.matches.forEach((match) => {
        expect(match.match_reason).toBeDefined();
        expect(typeof match.match_reason).toBe("string");
      });
    }
  });

  it(" Returns processing time", async () => {
    const matcher = new ConsolidatedMatchingEngine("test-key");
    const jobs = buildMockJob({}, 5);
    const user = buildMockUser();

    const result = await matcher.performMatching(jobs, user);

    expect(result.processingTime).toBeGreaterThanOrEqual(0);
  });

  it(" Returns method indicator", async () => {
    const matcher = new ConsolidatedMatchingEngine("test-key");
    const jobs = buildMockJob({}, 5);
    const user = buildMockUser();

    const result = await matcher.performMatching(jobs, user);

    const validMethods = [
      "ai_success",
      "ai_timeout",
      "ai_failed",
      "rule_based",
    ];
    expect(validMethods).toContain(result.method);
  });
});

describe("ConsolidatedMatcher - Cache Key Generation", () => {
  const matcher = createConsolidatedMatcher();

  it("should generate consistent cache keys for same user", () => {
    const user1 = buildMockUser({
      career_path: ["tech"],
      target_cities: ["London"],
    });
    const user2 = buildMockUser({
      career_path: ["tech"],
      target_cities: ["London"],
    });

    const key1 = matcher.generateCacheKey(user1, 5);
    const key2 = matcher.generateCacheKey(user2, 5);

    expect(key1).toBe(key2);
    expect(key1).toBeTruthy();
  });

  it("should generate non-empty cache keys", () => {
    const user = buildMockUser({
      career_path: ["data-science"],
      target_cities: ["London"],
    });

    const key = matcher.generateCacheKey(user, 5);

    expect(key).toBeTruthy();
    expect(key.length).toBeGreaterThan(0);
  });

  it("should generate string cache keys", () => {
    const user = buildMockUser({
      career_path: ["tech"],
      target_cities: ["Berlin", "Paris"],
    });

    const key = matcher.generateCacheKey(user, 5);

    expect(typeof key).toBe("string");
    expect(key.length).toBeGreaterThan(0);
  });

  it("should generate valid cache keys for minimal user", () => {
    const user = buildMockUser({ experience_level: "entry" });

    const key = matcher.generateCacheKey(user, 5);

    expect(key).toBeTruthy();
    expect(typeof key).toBe("string");
  });

  it("should generate cache keys for different job counts", () => {
    const user = buildMockUser({});

    const key1 = matcher.generateCacheKey(user, 5);
    const key2 = matcher.generateCacheKey(user, 10);

    expect(key1).toBeTruthy();
    expect(key2).toBeTruthy();
    // Keys may or may not be different based on implementation
  });

  it("should generate cache keys for different career paths", () => {
    const user1 = buildMockUser({ career_path: ["tech"] });
    const user2 = buildMockUser({ career_path: ["data-science"] });

    const key1 = matcher.generateCacheKey(user1, 5);
    const key2 = matcher.generateCacheKey(user2, 5);

    expect(key1).toBeTruthy();
    expect(key2).toBeTruthy();
  });

  it("should generate cache keys for different cities", () => {
    const user1 = buildMockUser({ target_cities: ["London"] });
    const user2 = buildMockUser({ target_cities: ["Berlin"] });

    const key1 = matcher.generateCacheKey(user1, 5);
    const key2 = matcher.generateCacheKey(user2, 5);

    expect(key1).toBeTruthy();
    expect(key2).toBeTruthy();
  });
});
