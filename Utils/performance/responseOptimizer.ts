/**
 * API Response Optimizer
 * Provides response caching, compression, and optimization
 */

import { NextResponse } from "next/server";

export interface CacheConfig {
  ttl: number; // Time to live in milliseconds
  tags?: string[]; // Cache tags for invalidation
  vary?: string[]; // Vary headers for cache keys
}

export interface ResponseOptimizationOptions {
  enableCompression?: boolean;
  enableCaching?: boolean;
  cacheConfig?: CacheConfig;
  enableETag?: boolean;
  maxAge?: number; // Cache-Control max-age in seconds
}

export class ResponseOptimizer {
  private cache = new Map<
    string,
    { data: any; timestamp: number; etag: string }
  >();
  private defaultTTL = 5 * 60 * 1000; // 5 minutes

  /**
   * Create an optimized response with caching and compression
   */
  createOptimizedResponse(
    data: any,
    options: ResponseOptimizationOptions = {},
    status: number = 200,
  ): NextResponse {
    const {
      enableCompression = true,
      enableCaching = true,
      cacheConfig,
      enableETag = true,
      maxAge = 300, // 5 minutes default
    } = options;

    let response: NextResponse;

    // Serialize data
    const jsonData = JSON.stringify(data);
    const etag = this.generateETag(jsonData);

    // Check cache if enabled
    if (enableCaching && this.shouldCache(data)) {
      const cached = this.getFromCache(
        etag,
        cacheConfig?.ttl || this.defaultTTL,
      );
      if (cached) {
        response = new NextResponse(cached, { status });
        this.addCacheHeaders(response, maxAge, etag, true);
        return response;
      }
    }

    // Create response
    response = new NextResponse(jsonData, {
      status,
      headers: {
        "Content-Type": "application/json",
        "X-Response-Time": Date.now().toString(),
        "X-Response-Size": Buffer.byteLength(jsonData, "utf8").toString(),
      },
    });

    // Add optimization headers
    this.addOptimizationHeaders(response, {
      enableCompression,
      enableCaching,
      enableETag,
      maxAge,
      etag,
      data,
    });

    // Add cache headers for new responses (not from cache)
    if (enableCaching && this.shouldCache(data)) {
      this.addCacheHeaders(response, maxAge, etag, false); // false = not from cache
    }

    // Cache the response if enabled
    if (enableCaching && this.shouldCache(data)) {
      this.setCache(etag, jsonData);
    }

    return response;
  }

  /**
   * Create a streaming response for large datasets
   */
  createStreamingResponse(
    dataGenerator: AsyncGenerator<any, void, unknown>,
    options: ResponseOptimizationOptions = {},
  ): NextResponse {
    const { enableCompression = true } = options;

    const stream = new ReadableStream({
      async start(controller) {
        const encoder = new TextEncoder();

        try {
          // Start JSON array
          controller.enqueue(encoder.encode("["));
          let first = true;

          for await (const item of dataGenerator) {
            if (!first) {
              controller.enqueue(encoder.encode(","));
            }
            first = false;

            const jsonItem = JSON.stringify(item);
            controller.enqueue(encoder.encode(jsonItem));
          }

          // End JSON array
          controller.enqueue(encoder.encode("]"));
          controller.close();
        } catch (error) {
          controller.error(error);
        }
      },
    });

    const response = new NextResponse(stream, {
      headers: {
        "Content-Type": "application/json",
        "Transfer-Encoding": "chunked",
        "X-Response-Type": "streaming",
      },
    });

    if (enableCompression) {
      response.headers.set("Content-Encoding", "gzip");
    }

    return response;
  }

  /**
   * Create a paginated response
   */
  createPaginatedResponse(
    data: any[],
    page: number,
    limit: number,
    total: number,
    options: ResponseOptimizationOptions = {},
  ): NextResponse {
    const totalPages = Math.ceil(total / limit);
    const hasNext = page < totalPages;
    const hasPrev = page > 1;

    const paginatedData = {
      data,
      pagination: {
        page,
        limit,
        total,
        totalPages,
        hasNext,
        hasPrev,
        nextPage: hasNext ? page + 1 : null,
        prevPage: hasPrev ? page - 1 : null,
      },
    };

    return this.createOptimizedResponse(paginatedData, {
      ...options,
      cacheConfig: {
        ttl: 2 * 60 * 1000, // 2 minutes for paginated data
        tags: ["paginated"],
      },
    });
  }

  /**
   * Create an error response with proper formatting
   */
  createErrorResponse(
    error: string | Error,
    status: number = 500,
    details?: any,
  ): NextResponse {
    const errorData = {
      error: error instanceof Error ? error.message : error,
      status,
      timestamp: new Date().toISOString(),
      ...(details && { details }),
    };

    return this.createOptimizedResponse(
      errorData,
      {
        enableCaching: false,
        enableCompression: true,
      },
      status,
    );
  }

  /**
   * Create a success response with metadata
   */
  createSuccessResponse(
    data: any,
    message?: string,
    options: ResponseOptimizationOptions = {},
  ): NextResponse {
    const successData = {
      success: true,
      data,
      message,
      timestamp: new Date().toISOString(),
    };

    return this.createOptimizedResponse(successData, options);
  }

  private addOptimizationHeaders(
    response: NextResponse,
    options: {
      enableCompression: boolean;
      enableCaching: boolean;
      enableETag: boolean;
      maxAge: number;
      etag: string;
      data?: any; // Add data parameter to check if it should be cached
    },
  ): void {
    const { enableCompression, enableCaching, enableETag, maxAge, etag, data } =
      options;

    // Cache headers - don't cache error responses even if caching is enabled
    const shouldCache = enableCaching && (!data || this.shouldCache(data));
    if (shouldCache) {
      response.headers.set(
        "Cache-Control",
        `public, max-age=${maxAge}, s-maxage=${maxAge}`,
      );
      response.headers.set("Vary", "Accept-Encoding");
    } else {
      response.headers.set(
        "Cache-Control",
        "no-cache, no-store, must-revalidate",
      );
    }

    // ETag for conditional requests
    if (enableETag) {
      response.headers.set("ETag", etag);
    }

    // Compression headers
    if (enableCompression) {
      response.headers.set("Content-Encoding", "gzip");
    }

    // Performance headers
    response.headers.set("X-Content-Type-Options", "nosniff");
    response.headers.set("X-Frame-Options", "DENY");
    response.headers.set("X-XSS-Protection", "1; mode=block");
  }

  private addCacheHeaders(
    response: NextResponse,
    maxAge: number,
    etag: string,
    fromCache: boolean,
  ): void {
    response.headers.set("Cache-Control", `public, max-age=${maxAge}`);
    response.headers.set("ETag", etag);
    response.headers.set("X-Cache", fromCache ? "HIT" : "MISS");
  }

  private generateETag(data: string): string {
    // Simple hash-based ETag
    let hash = 0;
    for (let i = 0; i < data.length; i++) {
      const char = data.charCodeAt(i);
      hash = (hash << 5) - hash + char;
      hash = hash & hash; // Convert to 32-bit integer
    }
    return `"${Math.abs(hash).toString(36)}"`;
  }

  private shouldCache(data: any): boolean {
    // Don't cache error responses or very large data
    if (data?.error || data?.status >= 400) return false;

    const size = JSON.stringify(data).length;
    return size < 1024 * 1024; // Less than 1MB
  }

  private getFromCache(etag: string, ttl: number): string | null {
    const cached = this.cache.get(etag);
    if (!cached) return null;

    if (Date.now() - cached.timestamp > ttl) {
      this.cache.delete(etag);
      return null;
    }

    return cached.data;
  }

  private setCache(etag: string, data: string): void {
    this.cache.set(etag, {
      data,
      timestamp: Date.now(),
      etag,
    });
  }

  /**
   * Clear cache by tag or pattern
   */
  clearCache(tag?: string): void {
    if (!tag) {
      this.cache.clear();
      return;
    }

    // Clear cache entries that match the tag
    for (const [key, _value] of this.cache.entries()) {
      if (key.includes(tag)) {
        this.cache.delete(key);
      }
    }
  }

  /**
   * Get cache statistics
   */
  getCacheStats(): { size: number; memoryUsage: number } {
    const size = this.cache.size;
    let memoryUsage = 0;

    for (const value of this.cache.values()) {
      memoryUsage += Buffer.byteLength(value.data, "utf8");
    }

    return { size, memoryUsage };
  }
}

// Singleton instance
export const responseOptimizer = new ResponseOptimizer();

// Convenience functions
export function createOptimizedResponse(
  data: any,
  options?: ResponseOptimizationOptions,
) {
  return responseOptimizer.createOptimizedResponse(data, options);
}

export function createErrorResponse(
  error: string | Error,
  status?: number,
  details?: any,
) {
  return responseOptimizer.createErrorResponse(error, status, details);
}

export function createSuccessResponse(
  data: any,
  message?: string,
  options?: ResponseOptimizationOptions,
) {
  return responseOptimizer.createSuccessResponse(data, message, options);
}

export function createPaginatedResponse(
  data: any[],
  page: number,
  limit: number,
  total: number,
  options?: ResponseOptimizationOptions,
) {
  return responseOptimizer.createPaginatedResponse(
    data,
    page,
    limit,
    total,
    options,
  );
}
