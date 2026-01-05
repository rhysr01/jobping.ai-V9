/**
 * Database Query Optimizer
 * Provides optimized database queries with proper indexing and caching
 */

// ================================
// QUERY OPTIMIZATION CONFIGURATION
// ================================

export interface QueryConfig {
  useCache: boolean;
  cacheTTL: number; // Time to live in seconds
  maxRows: number;
  timeout: number; // Query timeout in milliseconds
}

export interface OptimizedQueryResult<T> {
  data: T[];
  count: number;
  executionTime: number;
  cacheHit: boolean;
  query: string;
}

// ================================
// QUERY OPTIMIZER CLASS
// ================================

export class DatabaseQueryOptimizer {
  private supabase: any;
  private queryCache: Map<
    string,
    { data: any; timestamp: number; ttl: number }
  > = new Map();

  constructor(supabaseClient: any) {
    this.supabase = supabaseClient;
  }

  /**
   * Optimized job fetching with proper indexing and caching
   */
  async getOptimizedJobs(
    config: {
      limit?: number;
      categories?: string[];
      locations?: string[];
      excludeSent?: boolean;
      useCache?: boolean;
    } = {},
  ): Promise<OptimizedQueryResult<any>> {
    const startTime = Date.now();
    const cacheKey = this.generateCacheKey("jobs", config);

    // Check cache first
    if (config.useCache !== false) {
      const cached = this.getFromCache(cacheKey);
      if (cached) {
        return {
          data: cached.data,
          count: cached.data.length,
          executionTime: Date.now() - startTime,
          cacheHit: true,
          query: "cached",
        };
      }
    }

    // Build optimized query
    let query = this.supabase
      .from("jobs")
      .select(
        `
        id,
        title,
        company,
        location,
        job_url,
        description,
        categories,
        posted_at,
        created_at,
        job_hash,
        is_sent
      `,
      )
      .eq("is_active", true)
      .order("posted_at", { ascending: false });

    // Apply filters with proper indexing
    if (config.categories && config.categories.length > 0) {
      query = query.overlaps("categories", config.categories);
    }

    if (config.locations && config.locations.length > 0) {
      query = query.in("location", config.locations);
    }

    if (config.excludeSent) {
      query = query.eq("is_sent", false);
    }

    if (config.limit) {
      query = query.limit(config.limit);
    }

    const { data, error, count } = await query;

    if (error) {
      throw new Error(`Database query failed: ${error.message}`);
    }

    const result = {
      data: data || [],
      count: count || 0,
      executionTime: Date.now() - startTime,
      cacheHit: false,
      query: "optimized_jobs_query",
    };

    // Cache result
    if (config.useCache !== false) {
      this.setCache(cacheKey, result.data, 300); // 5 minutes TTL
    }

    return result;
  }

  /**
   * Optimized user fetching with proper indexing
   */
  async getOptimizedUsers(
    config: {
      limit?: number;
      isActive?: boolean;
      isPremium?: boolean;
      lastMatchedBefore?: string;
      useCache?: boolean;
    } = {},
  ): Promise<OptimizedQueryResult<any>> {
    const startTime = Date.now();
    const cacheKey = this.generateCacheKey("users", config);

    // Check cache first
    if (config.useCache !== false) {
      const cached = this.getFromCache(cacheKey);
      if (cached) {
        return {
          data: cached.data,
          count: cached.data.length,
          executionTime: Date.now() - startTime,
          cacheHit: true,
          query: "cached",
        };
      }
    }

    let query = this.supabase.from("users").select(`
        id,
        email,
        full_name,
        professional_expertise,
        visa_status,
        start_date,
        work_environment,
        languages_spoken,
        company_types,
        roles_selected,
        career_path,
        entry_level_preference,
        target_cities,
        is_premium,
        created_at,
        last_matched_at,
        email_verified
      `);

    // Apply filters
    if (config.isActive !== undefined) {
      query = query.eq("is_active", config.isActive);
    }

    if (config.isPremium !== undefined) {
      query = query.eq("is_premium", config.isPremium);
    }

    if (config.lastMatchedBefore) {
      query = query.lt("last_matched_at", config.lastMatchedBefore);
    }

    if (config.limit) {
      query = query.limit(config.limit);
    }

    const { data, error, count } = await query;

    if (error) {
      throw new Error(`Database query failed: ${error.message}`);
    }

    const result = {
      data: data || [],
      count: count || 0,
      executionTime: Date.now() - startTime,
      cacheHit: false,
      query: "optimized_users_query",
    };

    // Cache result
    if (config.useCache !== false) {
      this.setCache(cacheKey, result.data, 600); // 10 minutes TTL
    }

    return result;
  }

  /**
   * Optimized match fetching with proper indexing
   */
  async getOptimizedMatches(
    config: {
      userEmail?: string;
      jobHash?: string;
      minScore?: number;
      limit?: number;
      useCache?: boolean;
    } = {},
  ): Promise<OptimizedQueryResult<any>> {
    const startTime = Date.now();
    const cacheKey = this.generateCacheKey("matches", config);

    // Check cache first
    if (config.useCache !== false) {
      const cached = this.getFromCache(cacheKey);
      if (cached) {
        return {
          data: cached.data,
          count: cached.data.length,
          executionTime: Date.now() - startTime,
          cacheHit: true,
          query: "cached",
        };
      }
    }

    let query = this.supabase
      .from("matches")
      .select(
        `
        id,
        user_email,
        job_hash,
        match_score,
        match_reason,
        confidence_score,
        processing_method,
        matched_at,
        created_at
      `,
      )
      .order("matched_at", { ascending: false });

    // Apply filters
    if (config.userEmail) {
      query = query.eq("user_email", config.userEmail);
    }

    if (config.jobHash) {
      query = query.eq("job_hash", config.jobHash);
    }

    if (config.minScore) {
      query = query.gte("match_score", config.minScore);
    }

    if (config.limit) {
      query = query.limit(config.limit);
    }

    const { data, error, count } = await query;

    if (error) {
      throw new Error(`Database query failed: ${error.message}`);
    }

    const result = {
      data: data || [],
      count: count || 0,
      executionTime: Date.now() - startTime,
      cacheHit: false,
      query: "optimized_matches_query",
    };

    // Cache result
    if (config.useCache !== false) {
      this.setCache(cacheKey, result.data, 180); // 3 minutes TTL
    }

    return result;
  }

  /**
   * Batch insert with optimization
   */
  async batchInsert(
    table: string,
    data: any[],
    options: {
      batchSize?: number;
      onConflict?: string;
      ignoreDuplicates?: boolean;
    } = {},
  ): Promise<{ inserted: number; errors: any[] }> {
    const batchSize = options.batchSize || 100;
    const batches = this.chunkArray(data, batchSize);
    let totalInserted = 0;
    const errors: any[] = [];

    for (const batch of batches) {
      try {
        let query = this.supabase.from(table).insert(batch);

        if (options.onConflict) {
          query = query.upsert(batch, { onConflict: options.onConflict });
        }

        if (options.ignoreDuplicates) {
          query = query.ignoreDuplicates();
        }

        const { error } = await query;

        if (error) {
          errors.push(error);
        } else {
          totalInserted += batch.length;
        }
      } catch (error) {
        errors.push(error);
      }
    }

    return { inserted: totalInserted, errors };
  }

  /**
   * Cache management
   */
  private generateCacheKey(prefix: string, config: any): string {
    const configStr = JSON.stringify(config);
    return `${prefix}:${Buffer.from(configStr).toString("base64")}`;
  }

  private getFromCache(key: string): any | null {
    const cached = this.queryCache.get(key);
    if (!cached) return null;

    const now = Date.now();
    if (now - cached.timestamp > cached.ttl * 1000) {
      this.queryCache.delete(key);
      return null;
    }

    return cached;
  }

  private setCache(key: string, data: any, ttl: number): void {
    this.queryCache.set(key, {
      data,
      timestamp: Date.now(),
      ttl,
    });
  }

  /**
   * Utility functions
   */
  private chunkArray<T>(array: T[], size: number): T[][] {
    const chunks: T[][] = [];
    for (let i = 0; i < array.length; i += size) {
      chunks.push(array.slice(i, i + size));
    }
    return chunks;
  }

  /**
   * Clear cache
   */
  clearCache(): void {
    this.queryCache.clear();
  }

  /**
   * Get cache statistics
   */
  getCacheStats(): {
    size: number;
    keys: string[];
    hitRate: number;
  } {
    return {
      size: this.queryCache.size,
      keys: Array.from(this.queryCache.keys()),
      hitRate: 0, // Would need to track hits/misses for accurate calculation
    };
  }
}

// ================================
// RECOMMENDED DATABASE INDEXES
// ================================

export const RECOMMENDED_INDEXES = [
  // Jobs table indexes
  "CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_jobs_categories_gin ON jobs USING GIN(categories);",
  "CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_jobs_posted_at_desc ON jobs(posted_at DESC);",
  "CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_jobs_is_active_posted ON jobs(is_active, posted_at DESC);",
  "CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_jobs_location ON jobs(location);",
  "CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_jobs_is_sent ON jobs(is_sent);",

  // Users table indexes
  "CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_users_email_verified ON users(email_verified);",
  "CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_users_is_premium ON users(is_premium);",
  "CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_users_last_matched ON users(last_matched_at);",
  "CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_users_created_at ON users(created_at);",

  // Matches table indexes
  "CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_matches_user_email ON matches(user_email);",
  "CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_matches_job_hash ON matches(job_hash);",
  "CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_matches_user_created ON matches(user_email, created_at DESC);",
  "CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_matches_score ON matches(match_score DESC);",
  "CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_matches_created_at ON matches(created_at DESC);",

  // Subscriptions table indexes
  // Note: stripe_customer_id index removed - using Polar instead
  "CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_subscriptions_status ON subscriptions(status);",
  "CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_subscriptions_user_id ON subscriptions(user_id);",
];

// ================================
// CONVENIENCE FUNCTIONS
// ================================

export function createQueryOptimizer(
  supabaseClient: any,
): DatabaseQueryOptimizer {
  return new DatabaseQueryOptimizer(supabaseClient);
}

export async function createRecommendedIndexes(
  supabaseClient: any,
): Promise<void> {
  console.log("Creating recommended database indexes...");

  for (const indexQuery of RECOMMENDED_INDEXES) {
    try {
      const { error } = await supabaseClient.rpc("exec_sql", {
        sql: indexQuery,
      });
      if (error) {
        console.warn(`Failed to create index: ${error.message}`);
      } else {
        console.log(` Created index: ${indexQuery.split(" ")[5]}`);
      }
    } catch (error) {
      console.warn(`Failed to create index: ${error}`);
    }
  }

  console.log("Database index creation completed.");
}
