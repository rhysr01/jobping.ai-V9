// Utils/matching/semanticRetrieval.ts
import { getDatabaseClient } from '@/Utils/databasePool';
import { Job as ScrapersJob } from '@/scrapers/types';
import type { UserPreferences } from '@/Utils/matching/types';

export interface SemanticJob extends ScrapersJob {
  semantic_score: number;
  embedding_distance: number;
}

/**
 * Semantic retrieval using pgvector for better job matching
 * This addresses the issue where keyword matching misses semantically relevant jobs
 */
export class SemanticRetrievalService {
  private supabase = getDatabaseClient();

  /**
   * Get top 200 semantically relevant jobs for a user
   * Uses vector similarity search to find jobs that match user preferences semantically
   */
  async getSemanticCandidates(
    userPrefs: UserPreferences,
    limit: number = 200
  ): Promise<SemanticJob[]> {
    try {
      // Build semantic query based on user preferences
      const semanticQuery = this.buildSemanticQuery(userPrefs);
      
      // Use pgvector similarity search
      const { data: jobs, error } = await this.supabase
        .rpc('search_jobs_semantic', {
          query_text: semanticQuery,
          match_threshold: 0.3, // Minimum similarity threshold
          match_count: limit
        });

      if (error) {
        console.warn('Semantic search failed, falling back to keyword search:', error);
        return [];
      }

      return jobs || [];
    } catch (error) {
      console.warn('Semantic retrieval error:', error);
      return [];
    }
  }

  /**
   * Build a semantic query string from user preferences
   * This creates a rich text representation for vector search
   */
  private buildSemanticQuery(userPrefs: UserPreferences): string {
    const parts: string[] = [];

    // Career path and roles
    if (userPrefs.career_path && userPrefs.career_path.length > 0) {
      parts.push(`Career: ${userPrefs.career_path.join(', ')}`);
    }

    if (userPrefs.roles_selected && userPrefs.roles_selected.length > 0) {
      parts.push(`Roles: ${userPrefs.roles_selected.join(', ')}`);
    }

    // Work environment preferences
    if (userPrefs.work_environment) {
      parts.push(`Work environment: ${userPrefs.work_environment}`);
    }

    // Experience level
    if (userPrefs.entry_level_preference) {
      parts.push(`Experience level: ${userPrefs.entry_level_preference}`);
    }

    // Company types
    if (userPrefs.company_types && userPrefs.company_types.length > 0) {
      parts.push(`Company types: ${userPrefs.company_types.join(', ')}`);
    }

    // Languages
    if (userPrefs.languages_spoken && userPrefs.languages_spoken.length > 0) {
      parts.push(`Languages: ${userPrefs.languages_spoken.join(', ')}`);
    }

    // Target cities
    if (userPrefs.target_cities && userPrefs.target_cities.length > 0) {
      parts.push(`Location: ${userPrefs.target_cities.join(', ')}`);
    }

    return parts.join('. ');
  }

  /**
   * Check if semantic search is available
   * Returns true if pgvector extension and job embeddings are set up
   */
  async isSemanticSearchAvailable(): Promise<boolean> {
    try {
      const { data, error } = await this.supabase
        .from('jobs')
        .select('id')
        .not('embedding', 'is', null)
        .limit(1);

      return !error && data && data.length > 0;
    } catch {
      return false;
    }
  }
}

// Export singleton instance
export const semanticRetrievalService = new SemanticRetrievalService();
