/**
 * Unit Tests for Response Optimizer
 *
 * Tests performance optimization logic, caching, and response formatting.
 * Focuses on business logic rather than external dependencies.
 */

import {
  ResponseOptimizer,
  responseOptimizer,
  createOptimizedResponse,
  createErrorResponse,
  createSuccessResponse,
  createPaginatedResponse,
} from "@/Utils/performance/responseOptimizer";

describe("Response Optimizer", () => {
  let optimizer: ResponseOptimizer;

  beforeEach(() => {
    optimizer = new ResponseOptimizer();
    // Clear cache between tests
    optimizer.clearCache();
  });

  describe("createOptimizedResponse", () => {
    it("should create a basic response with default options", () => {
      const data = { message: "test" };
      const response = optimizer.createOptimizedResponse(data);

      expect(response.status).toBe(200);
      expect(response.headers.get("Content-Type")).toBe("application/json");
      expect(response.headers.get("X-Response-Time")).toBeDefined();
      expect(response.headers.get("X-Response-Size")).toBeDefined();
    });

    it("should create response with custom status", () => {
      const data = { error: "not found" };
      const response = optimizer.createOptimizedResponse(data, {}, 404);

      expect(response.status).toBe(404);
    });

    it("should add cache headers when caching is enabled", () => {
      const data = { message: "cached" };
      const response = optimizer.createOptimizedResponse(data, {
        enableCaching: true,
        maxAge: 300,
      });

      expect(response.headers.get("Cache-Control")).toBe(
        "public, max-age=300, s-maxage=300",
      );
      expect(response.headers.get("ETag")).toBeDefined();
    });

    it("should disable caching for error responses", () => {
      const data = { error: "server error", status: 500 };
      const response = optimizer.createOptimizedResponse(data, {
        enableCaching: true,
      });

      expect(response.headers.get("Cache-Control")).toBe(
        "no-cache, no-store, must-revalidate",
      );
    });

    it("should add compression headers when enabled", () => {
      const data = { message: "compressed" };
      const response = optimizer.createOptimizedResponse(data, {
        enableCompression: true,
      });

      expect(response.headers.get("Content-Encoding")).toBe("gzip");
      expect(response.headers.get("Vary")).toBe("Accept-Encoding");
    });

    it("should generate consistent ETags for same data", () => {
      const data = { consistent: "data" };
      const response1 = optimizer.createOptimizedResponse(data);
      const response2 = optimizer.createOptimizedResponse(data);

      const etag1 = response1.headers.get("ETag");
      const etag2 = response2.headers.get("ETag");

      expect(etag1).toBe(etag2);
      expect(etag1).toMatch(/^"[a-z0-9]+"$/);
    });

    it("should generate different ETags for different data", () => {
      const data1 = { data: "first" };
      const data2 = { data: "second" };
      const response1 = optimizer.createOptimizedResponse(data1);
      const response2 = optimizer.createOptimizedResponse(data2);

      const etag1 = response1.headers.get("ETag");
      const etag2 = response2.headers.get("ETag");

      expect(etag1).not.toBe(etag2);
    });
  });

  describe("Caching Behavior", () => {
    it("should cache and return cached responses", () => {
      const data = { cached: "data" };

      // First request - should cache
      const response1 = optimizer.createOptimizedResponse(data, {
        enableCaching: true,
        cacheConfig: { ttl: 60000 }, // 1 minute
      });

      // Second request with same data - should hit cache
      const response2 = optimizer.createOptimizedResponse(data, {
        enableCaching: true,
        cacheConfig: { ttl: 60000 },
      });

      expect(response1.headers.get("X-Cache")).toBe("MISS");
      expect(response2.headers.get("X-Cache")).toBe("HIT");
    });

    it("should respect cache TTL", async () => {
      const data = { ttl: "test" };

      // Cache with short TTL
      optimizer.createOptimizedResponse(data, {
        enableCaching: true,
        cacheConfig: { ttl: 1 }, // 1ms TTL
      });

      // Wait for cache to expire
      await new Promise((resolve) => setTimeout(resolve, 2));

      // Should miss cache
      const response = optimizer.createOptimizedResponse(data, {
        enableCaching: true,
        cacheConfig: { ttl: 1 },
      });

      expect(response.headers.get("X-Cache")).toBe("MISS");
    });

    it("should not cache large responses", () => {
      // Create large data (>1MB)
      const largeData = { data: "x".repeat(1024 * 1024 + 1) };

      const response = optimizer.createOptimizedResponse(largeData, {
        enableCaching: true,
      });

      // Should not have cache headers
      expect(response.headers.get("X-Cache")).toBeNull();
    });

    it("should not cache error responses", () => {
      const errorData = { error: "test error", status: 500 };

      const response = optimizer.createOptimizedResponse(errorData, {
        enableCaching: true,
      });

      expect(response.headers.get("X-Cache")).toBeNull();
      expect(response.headers.get("Cache-Control")).toBe(
        "no-cache, no-store, must-revalidate",
      );
    });
  });

  describe("createErrorResponse", () => {
    it("should create properly formatted error response", () => {
      const error = "Test error";
      const response = optimizer.createErrorResponse(error, 400);

      expect(response.status).toBe(400);

      // Should parse the response body
      const responseBody = JSON.parse((response.body as any) || "{}");
      expect(responseBody.error).toBe("Test error");
      expect(responseBody.status).toBe(400);
      expect(responseBody.timestamp).toBeDefined();
    });

    it("should handle Error objects", () => {
      const error = new Error("Wrapped error");
      const response = optimizer.createErrorResponse(error, 500);

      expect(response.status).toBe(500);

      const responseBody = JSON.parse((response.body as any) || "{}");
      expect(responseBody.error).toBe("Wrapped error");
    });

    it("should include details when provided", () => {
      const details = { field: "email", reason: "invalid format" };
      const response = optimizer.createErrorResponse(
        "Validation failed",
        422,
        details,
      );

      const responseBody = JSON.parse((response.body as any) || "{}");
      expect(responseBody.details).toEqual(details);
    });

    it("should disable caching for error responses", () => {
      const response = optimizer.createErrorResponse("Error");

      expect(response.headers.get("Cache-Control")).toBe(
        "no-cache, no-store, must-revalidate",
      );
    });
  });

  describe("createSuccessResponse", () => {
    it("should create properly formatted success response", () => {
      const data = { user: { id: 1, name: "Test" } };
      const message = "User created successfully";
      const response = optimizer.createSuccessResponse(data, message);

      expect(response.status).toBe(200);

      const responseBody = JSON.parse((response.body as any) || "{}");
      expect(responseBody.success).toBe(true);
      expect(responseBody.data).toEqual(data);
      expect(responseBody.message).toBe(message);
      expect(responseBody.timestamp).toBeDefined();
    });

    it("should handle responses without message", () => {
      const data = { result: "success" };
      const response = optimizer.createSuccessResponse(data);

      const responseBody = JSON.parse((response.body as any) || "{}");
      expect(responseBody.success).toBe(true);
      expect(responseBody.data).toEqual(data);
      expect(responseBody.message).toBeUndefined();
    });
  });

  describe("createPaginatedResponse", () => {
    const testData = [
      { id: 1, name: "Item 1" },
      { id: 2, name: "Item 2" },
    ];

    it("should create paginated response with correct metadata", () => {
      const response = optimizer.createPaginatedResponse(testData, 1, 10, 25);

      expect(response.status).toBe(200);

      const responseBody = JSON.parse((response.body as any) || "{}");
      expect(responseBody.data).toEqual(testData);
      expect(responseBody.pagination).toEqual({
        page: 1,
        limit: 10,
        total: 25,
        totalPages: 3,
        hasNext: true,
        hasPrev: false,
        nextPage: 2,
        prevPage: null,
      });
    });

    it("should calculate pagination correctly for middle page", () => {
      const response = optimizer.createPaginatedResponse(testData, 2, 10, 25);

      const responseBody = JSON.parse((response.body as any) || "{}");
      expect(responseBody.pagination).toEqual({
        page: 2,
        limit: 10,
        total: 25,
        totalPages: 3,
        hasNext: true,
        hasPrev: true,
        nextPage: 3,
        prevPage: 1,
      });
    });

    it("should calculate pagination correctly for last page", () => {
      const response = optimizer.createPaginatedResponse(testData, 3, 10, 25);

      const responseBody = JSON.parse((response.body as any) || "{}");
      expect(responseBody.pagination).toEqual({
        page: 3,
        limit: 10,
        total: 25,
        totalPages: 3,
        hasNext: false,
        hasPrev: true,
        nextPage: null,
        prevPage: 2,
      });
    });

    it("should handle single page results", () => {
      const response = optimizer.createPaginatedResponse(testData, 1, 10, 5);

      const responseBody = JSON.parse((response.body as any) || "{}");
      expect(responseBody.pagination).toEqual({
        page: 1,
        limit: 10,
        total: 5,
        totalPages: 1,
        hasNext: false,
        hasPrev: false,
        nextPage: null,
        prevPage: null,
      });
    });

    it("should set appropriate cache headers for paginated data", () => {
      const response = optimizer.createPaginatedResponse(testData, 1, 10, 25);

      // Should have shorter cache TTL for paginated data (2 minutes)
      expect(response.headers.get("Cache-Control")).toMatch(/max-age=120/);
    });
  });

  describe("Cache Management", () => {
    it("should clear all cache when no tag provided", () => {
      // Add some cached data
      optimizer.createOptimizedResponse(
        { test: "data1" },
        { enableCaching: true },
      );
      optimizer.createOptimizedResponse(
        { test: "data2" },
        { enableCaching: true },
      );

      expect(optimizer.getCacheStats().size).toBeGreaterThan(0);

      optimizer.clearCache();

      expect(optimizer.getCacheStats().size).toBe(0);
    });

    it("should clear cache by tag", () => {
      // Add cached data with different tags
      optimizer.createOptimizedResponse(
        { test: "paginated" },
        {
          enableCaching: true,
          cacheConfig: { tags: ["paginated"] },
        },
      );
      optimizer.createOptimizedResponse(
        { test: "user" },
        {
          enableCaching: true,
          cacheConfig: { tags: ["user"] },
        },
      );

      const initialSize = optimizer.getCacheStats().size;
      expect(initialSize).toBeGreaterThan(0);

      optimizer.clearCache("paginated");

      // Should have cleared paginated but kept user
      expect(optimizer.getCacheStats().size).toBeLessThan(initialSize);
    });

    it("should provide cache statistics", () => {
      const stats = optimizer.getCacheStats();

      expect(typeof stats.size).toBe("number");
      expect(typeof stats.memoryUsage).toBe("number");
      expect(stats.size).toBeGreaterThanOrEqual(0);
      expect(stats.memoryUsage).toBeGreaterThanOrEqual(0);
    });
  });

  describe("Security Headers", () => {
    it("should add security headers to all responses", () => {
      const response = optimizer.createOptimizedResponse({ test: "data" });

      expect(response.headers.get("X-Content-Type-Options")).toBe("nosniff");
      expect(response.headers.get("X-Frame-Options")).toBe("DENY");
      expect(response.headers.get("X-XSS-Protection")).toBe("1; mode=block");
    });

    it("should add security headers to error responses", () => {
      const response = optimizer.createErrorResponse("Error");

      expect(response.headers.get("X-Content-Type-Options")).toBe("nosniff");
      expect(response.headers.get("X-Frame-Options")).toBe("DENY");
    });
  });

  describe("Performance Headers", () => {
    it("should add performance metadata headers", () => {
      const data = { performance: "test" };
      const response = optimizer.createOptimizedResponse(data);

      expect(response.headers.get("X-Response-Time")).toBeDefined();
      expect(response.headers.get("X-Response-Size")).toBeDefined();

      const size = parseInt(response.headers.get("X-Response-Size") || "0");
      expect(size).toBeGreaterThan(0);
    });

    it("should accurately report response size", () => {
      const smallData = { small: "data" };
      const largeData = { large: "x".repeat(1000) };

      const smallResponse = optimizer.createOptimizedResponse(smallData);
      const largeResponse = optimizer.createOptimizedResponse(largeData);

      const smallSize = parseInt(
        smallResponse.headers.get("X-Response-Size") || "0",
      );
      const largeSize = parseInt(
        largeResponse.headers.get("X-Response-Size") || "0",
      );

      expect(largeSize).toBeGreaterThan(smallSize);
    });
  });

  describe("Singleton and Convenience Functions", () => {
    it("should export singleton instance", () => {
      expect(responseOptimizer).toBeInstanceOf(ResponseOptimizer);
    });

    it("should provide convenience functions", () => {
      const data = { convenience: "test" };

      const response = createOptimizedResponse(data);
      expect(response.status).toBe(200);

      const errorResponse = createErrorResponse("Test error", 400);
      expect(errorResponse.status).toBe(400);

      const successResponse = createSuccessResponse(data, "Success");
      expect(successResponse.status).toBe(200);

      const paginatedResponse = createPaginatedResponse([data], 1, 10, 25);
      expect(paginatedResponse.status).toBe(200);
    });
  });

  describe("Edge Cases and Error Handling", () => {
    it("should handle null and undefined data", () => {
      expect(() => optimizer.createOptimizedResponse(null)).not.toThrow();
      expect(() => optimizer.createOptimizedResponse(undefined)).not.toThrow();
    });

    it("should handle very large data structures", () => {
      const largeArray = Array.from({ length: 10000 }, (_, i) => ({
        id: i,
        data: "x".repeat(100),
      }));

      expect(() => optimizer.createOptimizedResponse(largeArray)).not.toThrow();
    });

    it("should handle circular references gracefully", () => {
      const circular: any = { self: null };
      circular.self = circular;

      // JSON.stringify handles circular references by throwing
      expect(() => optimizer.createOptimizedResponse(circular)).toThrow();
    });

    it("should handle empty objects and arrays", () => {
      const emptyObj = {};
      const emptyArr: any[] = [];

      expect(() => optimizer.createOptimizedResponse(emptyObj)).not.toThrow();
      expect(() => optimizer.createOptimizedResponse(emptyArr)).not.toThrow();
    });
  });
});
