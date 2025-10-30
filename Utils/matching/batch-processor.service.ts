/**
 * Batch Matching Processor
 * Groups similar users and shares AI calls for cost efficiency
 */

import { getDatabaseClient } from '@/Utils/databasePool';
import type { UserPreferences, JobMatch } from './types';
import { createConsolidatedMatcher } from '@/Utils/consolidatedMatching';
import type { Job } from '@/scrapers/types';
import { embeddingService } from './embedding.service';

export interface UserMatchResult {
  userEmail: string;
  matches: JobMatch[];
  method: 'ai_success' | 'ai_timeout' | 'ai_failed' | 'rule_based' | 'shared_cache';
  processingTime: number;
  confidence: number;
}

export interface UserSegment {
  segmentKey: string;
  users: Array<{
    email: string;
    preferences: UserPreferences;
  }>;
  representativeUser: UserPreferences;
}

/**
 * Batch processor that groups similar users for shared AI calls
 */
export class BatchMatchingProcessor {
  private supabase = getDatabaseClient();
  private matcher = createConsolidatedMatcher(process.env.OPENAI_API_KEY);
  private readonly SIMILARITY_THRESHOLD = 0.85; // Users with 85%+ similar preferences share cache

  /**
   * Process matching for multiple users with batching optimization
   */
  async processBatch(
    users: Array<{ email: string; preferences: UserPreferences }>,
    jobs: Job[],
    options: {
      useEmbeddings?: boolean;
      maxBatchSize?: number;
    } = {}
  ): Promise<Map<string, UserMatchResult>> {
    const results = new Map<string, UserMatchResult>();
    const { useEmbeddings = true, maxBatchSize = 10 } = options;

    // Step 1: Group users by similarity
    const userSegments = await this.groupUsersBySimilarity(users, useEmbeddings);

    console.log(`Grouped ${users.length} users into ${userSegments.size} segments`);

    // Step 2: Process each segment in parallel
    const segmentPromises = Array.from(userSegments.entries()).map(
      async ([segmentKey, segment]) => {
        return await this.processSegment(segment, jobs, results);
      }
    );

    await Promise.all(segmentPromises);

    return results;
  }

  /**
   * Group users by similarity using embeddings or fallback to heuristics
   */
  private async groupUsersBySimilarity(
    users: Array<{ email: string; preferences: UserPreferences }>,
    useEmbeddings: boolean
  ): Promise<Map<string, UserSegment>> {
    const segments = new Map<string, UserSegment>();

    if (useEmbeddings) {
      // Use embedding-based similarity grouping
      await this.groupByEmbeddingSimilarity(users, segments);
    } else {
      // Fallback to heuristic grouping (career path + cities)
      this.groupByHeuristics(users, segments);
    }

    return segments;
  }

  /**
   * Group users by embedding similarity
   * OPTIMIZED: Batch embedding generation + database similarity search
   */
  private async groupByEmbeddingSimilarity(
    users: Array<{ email: string; preferences: UserPreferences }>,
    segments: Map<string, UserSegment>
  ): Promise<void> {
    // OPTIMIZATION: Batch generate all user embeddings at once
    const userEmbeddings = await embeddingService.batchGenerateUserEmbeddings(users);
    
    if (userEmbeddings.size === 0) {
      // Fallback to heuristic if batch generation fails
      this.groupByHeuristics(users, segments);
      return;
    }

    // OPTIMIZATION: Use database similarity search for faster grouping
    // For small groups (<20), use in-memory comparison
    // For large groups, use database function
    
    if (users.length <= 20) {
      // In-memory grouping for small groups
      this.groupUsersInMemory(users, userEmbeddings, segments);
    } else {
      // Database-assisted grouping for large groups
      await this.groupUsersWithDatabase(users, userEmbeddings, segments);
    }
  }

  /**
   * Group users in memory (O(n²) but acceptable for small groups)
   */
  private groupUsersInMemory(
    users: Array<{ email: string; preferences: UserPreferences }>,
    userEmbeddings: Map<string, number[]>,
    segments: Map<string, UserSegment>
  ): void {
    const processed = new Set<string>();

    for (const user of users) {
      if (processed.has(user.email)) continue;

      const userEmbedding = userEmbeddings.get(user.email);
      if (!userEmbedding) {
        this.addToHeuristicSegment(user, segments);
        continue;
      }

      // Find similar users
      const similarUsers = [user];
      processed.add(user.email);

      for (const otherUser of users) {
        if (processed.has(otherUser.email)) continue;

        const otherEmbedding = userEmbeddings.get(otherUser.email);
        if (!otherEmbedding) continue;

        // Calculate cosine similarity
        const similarity = this.cosineSimilarity(userEmbedding, otherEmbedding);
        
        if (similarity >= this.SIMILARITY_THRESHOLD) {
          similarUsers.push(otherUser);
          processed.add(otherUser.email);
        }
      }

      // Create segment
      const segmentKey = `embedding_${user.email}_${similarUsers.length}`;
      segments.set(segmentKey, {
        segmentKey,
        users: similarUsers,
        representativeUser: user.preferences
      });
    }
  }

  /**
   * Group users using database similarity search (scales better)
   */
  private async groupUsersWithDatabase(
    users: Array<{ email: string; preferences: UserPreferences }>,
    userEmbeddings: Map<string, number[]>,
    segments: Map<string, UserSegment>
  ): Promise<void> {
    // Store embeddings first
    for (const user of users) {
      const embedding = userEmbeddings.get(user.email);
      if (embedding) {
        await embeddingService.storeUserEmbedding(user.email, embedding);
      }
    }

    // Group users using database similarity search
    const processed = new Set<string>();

    for (const user of users) {
      if (processed.has(user.email)) continue;

      const userEmbedding = userEmbeddings.get(user.email);
      if (!userEmbedding) {
        this.addToHeuristicSegment(user, segments);
        continue;
      }

      // Use database function to find similar users
      try {
        const { data: similarUsersData } = await this.supabase.rpc(
          'find_similar_users',
          {
            query_embedding: userEmbedding,
            match_threshold: this.SIMILARITY_THRESHOLD,
            match_count: 50
          }
        );

        const similarUsers = [user];
        processed.add(user.email);

        // Find matching users from database results
        if (similarUsersData) {
          for (const dbUser of similarUsersData) {
            const matchingUser = users.find(u => u.email === dbUser.email);
            if (matchingUser && !processed.has(matchingUser.email)) {
              similarUsers.push(matchingUser);
              processed.add(matchingUser.email);
            }
          }
        }

        // Create segment
        const segmentKey = `embedding_${user.email}_${similarUsers.length}`;
        segments.set(segmentKey, {
          segmentKey,
          users: similarUsers,
          representativeUser: user.preferences
        });
      } catch (error) {
        console.warn(`Database similarity search failed for ${user.email}, using heuristic:`, error);
        this.addToHeuristicSegment(user, segments);
      }
    }
  }

  /**
   * Group users by heuristics (career path + cities)
   */
  private groupByHeuristics(
    users: Array<{ email: string; preferences: UserPreferences }>,
    segments: Map<string, UserSegment>
  ): void {
    for (const user of users) {
      this.addToHeuristicSegment(user, segments);
    }
  }

  /**
   * Add user to heuristic-based segment
   */
  private addToHeuristicSegment(
    user: { email: string; preferences: UserPreferences },
    segments: Map<string, UserSegment>
  ): void {
    const careerPath = Array.isArray(user.preferences.career_path) 
      ? user.preferences.career_path[0] 
      : user.preferences.career_path || 'general';
    
    const cities = Array.isArray(user.preferences.target_cities)
      ? user.preferences.target_cities.sort().join('+')
      : user.preferences.target_cities || 'any';
    
    const level = user.preferences.entry_level_preference || 'entry';
    const segmentKey = `heuristic_${careerPath}_${cities}_${level}`.toLowerCase().replace(/[^a-z0-9_+]/g, '');

    if (!segments.has(segmentKey)) {
      segments.set(segmentKey, {
        segmentKey,
        users: [],
        representativeUser: user.preferences
      });
    }

    segments.get(segmentKey)!.users.push(user);
  }

  /**
   * Process a user segment: perform one AI call and share results
   * OPTIMIZED: Pre-filters jobs before sending to AI (saves tokens)
   */
  private async processSegment(
    segment: UserSegment,
    jobs: Job[],
    results: Map<string, UserMatchResult>
  ): Promise<void> {
    const startTime = Date.now();

    // OPTIMIZATION: Pre-filter jobs before AI matching (like individual processing)
    // This reduces token costs by 50-90% by sending only relevant jobs to AI
    let preFilteredJobs: any[] = jobs;
    
    try {
      // Import pre-filter function from utility
      const { preFilterJobsByUserPreferencesEnhanced } = await import('./preFilterJobs');
      
      // Pre-filter jobs using representative user preferences
      preFilteredJobs = await preFilterJobsByUserPreferencesEnhanced(
        jobs as any[],
        segment.representativeUser
      );
      
      // Only send top 50 pre-filtered jobs to AI (same as individual processing)
      preFilteredJobs = preFilteredJobs.slice(0, 50);
    } catch (error) {
      console.warn('Pre-filtering failed, using all jobs:', error);
      // Fallback: use all jobs if pre-filtering fails
      preFilteredJobs = jobs.slice(0, 50);
    }

    // Use representative user for AI matching with pre-filtered jobs
    const matchResult = await this.matcher.performMatching(
      preFilteredJobs,
      segment.representativeUser,
      false // Don't force rule-based
    );

    const processingTime = Date.now() - startTime;

    // Share results with all users in segment
    for (const user of segment.users) {
      results.set(user.email, {
        userEmail: user.email,
        matches: matchResult.matches,
        method: matchResult.method === 'ai_success' ? 'shared_cache' : matchResult.method,
        processingTime,
        confidence: matchResult.confidence
      });
    }

    console.log(
      `Processed segment ${segment.segmentKey}: ${segment.users.length} users, ` +
      `${matchResult.matches.length} matches, ${matchResult.method}, ${processingTime}ms, ` +
      `pre-filtered: ${preFilteredJobs.length}/${jobs.length} jobs`
    );
  }

  /**
   * Calculate cosine similarity between two embeddings
   */
  private cosineSimilarity(a: number[], b: number[]): number {
    if (a.length !== b.length) {
      throw new Error('Embeddings must have same length');
    }

    let dotProduct = 0;
    let normA = 0;
    let normB = 0;

    for (let i = 0; i < a.length; i++) {
      dotProduct += a[i] * b[i];
      normA += a[i] * a[i];
      normB += b[i] * b[i];
    }

    return dotProduct / (Math.sqrt(normA) * Math.sqrt(normB));
  }

  /**
   * Get segment statistics for monitoring
   */
  async getSegmentStats(): Promise<{
    totalUsers: number;
    totalSegments: number;
    avgUsersPerSegment: number;
    largestSegment: number;
  }> {
    const { count } = await this.supabase
      .from('users')
      .select('*', { count: 'exact', head: true })
      .eq('active', true);

    // This would need to be calculated from actual segments
    // For now, return placeholder
    return {
      totalUsers: count || 0,
      totalSegments: 0,
      avgUsersPerSegment: 0,
      largestSegment: 0
    };
  }
}

// Export singleton instance
export const batchMatchingProcessor = new BatchMatchingProcessor();

