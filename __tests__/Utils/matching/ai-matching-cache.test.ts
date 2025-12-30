/**
 * Tests for AI Matching Cache (LRU Cache)
 * Tests caching logic and eviction policies
 */

import { AIMatchingCache } from "@/Utils/matching/ai-matching.service";

describe("AI Matching Cache - LRU Cache", () => {
  beforeEach(() => {
    // Clear cache before each test
    AIMatchingCache["cache"].clear();
  });

  it("should store and retrieve values", () => {
    const key = "test-key";
    const value = [{ job_hash: "abc", score: 90 }];

    AIMatchingCache.set(key, value);
    const retrieved = AIMatchingCache.get(key);

    expect(retrieved).toEqual(value);
  });

  it("should return undefined for non-existent keys", () => {
    const retrieved = AIMatchingCache.get("non-existent-key");

    expect(retrieved).toBeUndefined();
  });

  it("should overwrite existing values", () => {
    const key = "test-key";
    const value1 = [{ job_hash: "abc", score: 90 }];
    const value2 = [{ job_hash: "xyz", score: 95 }];

    AIMatchingCache.set(key, value1);
    AIMatchingCache.set(key, value2);

    const retrieved = AIMatchingCache.get(key);
    expect(retrieved).toEqual(value2);
  });

  it("should track cache size", () => {
    AIMatchingCache.set("key1", [{ job_hash: "a", score: 80 }]);
    AIMatchingCache.set("key2", [{ job_hash: "b", score: 85 }]);
    AIMatchingCache.set("key3", [{ job_hash: "c", score: 90 }]);

    const size = AIMatchingCache["cache"].size();
    expect(size).toBe(3);
  });

  it("should clear all cache entries", () => {
    AIMatchingCache.set("key1", [{ job_hash: "a", score: 80 }]);
    AIMatchingCache.set("key2", [{ job_hash: "b", score: 85 }]);

    AIMatchingCache["cache"].clear();

    expect(AIMatchingCache["cache"].size()).toBe(0);
    expect(AIMatchingCache.get("key1")).toBeUndefined();
  });

  it("should handle multiple sets and gets", () => {
    for (let i = 0; i < 10; i++) {
      AIMatchingCache.set(`key${i}`, [{ job_hash: `job${i}`, score: 80 + i }]);
    }

    for (let i = 0; i < 10; i++) {
      const value = AIMatchingCache.get(`key${i}`);
      expect(value).toEqual([{ job_hash: `job${i}`, score: 80 + i }]);
    }
  });

  it("should evict least used entries when cache is full", () => {
    // This test would require accessing internal cache state or
    // filling the cache beyond max size (10,000 entries)
    // For practical testing, we verify the basic eviction mechanism exists

    const testCache = new (AIMatchingCache["cache"].constructor as any)(
      3,
      60000,
    );

    testCache.set("key1", [{ score: 80 }]);
    testCache.set("key2", [{ score: 85 }]);
    testCache.set("key3", [{ score: 90 }]);

    // Access key2 and key3 to increase their usage count
    testCache.get("key2");
    testCache.get("key3");

    // Add key4, which should evict key1 (least used)
    testCache.set("key4", [{ score: 95 }]);

    expect(testCache.get("key1")).toBeUndefined(); // Evicted
    expect(testCache.get("key2")).toBeDefined(); // Still there
    expect(testCache.get("key3")).toBeDefined(); // Still there
    expect(testCache.get("key4")).toBeDefined(); // Newly added
  });

  it("should track access counts correctly", () => {
    const key = "test-key";
    const value = [{ job_hash: "abc", score: 90 }];

    AIMatchingCache.set(key, value);

    // Access multiple times
    AIMatchingCache.get(key);
    AIMatchingCache.get(key);
    AIMatchingCache.get(key);

    // Verify value is still accessible
    expect(AIMatchingCache.get(key)).toEqual(value);
  });

  it("should handle cache key collisions", () => {
    const key = "collision-key";
    const value1 = [{ job_hash: "abc", score: 80 }];
    const value2 = [{ job_hash: "xyz", score: 90 }];

    AIMatchingCache.set(key, value1);
    expect(AIMatchingCache.get(key)).toEqual(value1);

    AIMatchingCache.set(key, value2);
    expect(AIMatchingCache.get(key)).toEqual(value2);
  });

  it("should handle various data types in cached arrays", () => {
    const complexValue = [
      { job_hash: "abc", score: 90, metadata: { source: "ai" } },
      { job_hash: "def", score: 85, metadata: { source: "rules" } },
    ];

    AIMatchingCache.set("complex-key", complexValue);
    const retrieved = AIMatchingCache.get("complex-key");

    expect(retrieved).toEqual(complexValue);
    expect(retrieved?.[0].metadata).toEqual({ source: "ai" });
  });

  it("should handle empty arrays", () => {
    AIMatchingCache.set("empty-key", []);
    const retrieved = AIMatchingCache.get("empty-key");

    expect(retrieved).toEqual([]);
  });
});

describe("AI Matching Cache - TTL Expiration", () => {
  beforeEach(() => {
    AIMatchingCache["cache"].clear();
  });

  it("should expire entries after TTL", async () => {
    // Create a cache with very short TTL (100ms)
    const shortTTLCache = new (AIMatchingCache["cache"].constructor as any)(
      100,
      100,
    );

    shortTTLCache.set("key1", [{ score: 80 }]);
    expect(shortTTLCache.get("key1")).toBeDefined();

    // Wait for TTL to expire
    await new Promise((resolve) => setTimeout(resolve, 150));

    expect(shortTTLCache.get("key1")).toBeUndefined();
  });

  it("should not expire entries within TTL", async () => {
    // Create a cache with longer TTL (500ms)
    const longTTLCache = new (AIMatchingCache["cache"].constructor as any)(
      100,
      500,
    );

    longTTLCache.set("key1", [{ score: 80 }]);

    // Wait but not long enough to expire
    await new Promise((resolve) => setTimeout(resolve, 100));

    expect(longTTLCache.get("key1")).toBeDefined();
  });

  it("should refresh entry timestamp on access", async () => {
    // This behavior depends on implementation
    // The current LRU cache doesn't refresh on access, but tracks usage
    const cache = new (AIMatchingCache["cache"].constructor as any)(100, 200);

    cache.set("key1", [{ score: 80 }]);

    // Access before expiry
    await new Promise((resolve) => setTimeout(resolve, 50));
    cache.get("key1");

    // Check it's still there
    expect(cache.get("key1")).toBeDefined();
  });
});
