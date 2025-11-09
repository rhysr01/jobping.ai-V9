/**
 * Embedding Service
 * Generates and manages vector embeddings for jobs and users
 */

import OpenAI from 'openai';
import { getDatabaseClient } from '@/Utils/databasePool';
import type { Job } from '@/scrapers/types';
import type { UserPreferences } from './types';

export class EmbeddingService {
  private openai: OpenAI | null = null;
  private supabase = getDatabaseClient();
  private readonly MODEL = 'text-embedding-3-small'; // 1536 dimensions, cheapest
  private readonly BATCH_SIZE = 100; // OpenAI allows up to 2048 per batch

  constructor() {
    // Don't initialize OpenAI client at construction time
    // This allows the service to be imported even if OPENAI_API_KEY is not set (e.g., during build)
  }

  /**
   * Get or initialize OpenAI client (lazy initialization)
   */
  private getOpenAIClient(): OpenAI {
    if (!this.openai) {
      const apiKey = process.env.OPENAI_API_KEY || process.env.OPEN_API_KEY;
      
      if (!apiKey) {
        throw new Error('OPENAI_API_KEY not configured');
      }
      
      // Clean the API key (remove quotes, newlines, whitespace)
      const cleanedKey = apiKey
        .trim()
        .replace(/^["']|["']$/g, '') // Remove surrounding quotes
        .replace(/\n/g, '') // Remove newlines
        .replace(/\r/g, '') // Remove carriage returns
        .trim();
      
      if (!cleanedKey.startsWith('sk-')) {
        throw new Error(`Invalid OpenAI API key format: should start with "sk-" but found "${cleanedKey.substring(0, 10)}..."`);
      }
      
      this.openai = new OpenAI({ apiKey: cleanedKey });
    }
    return this.openai;
  }

  /**
   * Generate embedding for a job
   */
  async generateJobEmbedding(job: Job): Promise<number[]> {
    const text = this.buildJobText(job);
    return await this.generateEmbedding(text);
  }

  /**
   * Generate embedding for user preferences
   */
  async generateUserEmbedding(preferences: UserPreferences): Promise<number[]> {
    const text = this.buildUserPreferencesText(preferences);
    return await this.generateEmbedding(text);
  }

  /**
   * Batch generate embeddings for multiple user preferences
   * OPTIMIZED: Single API call for all users
   */
  async batchGenerateUserEmbeddings(
    users: Array<{ email: string; preferences: UserPreferences }>
  ): Promise<Map<string, number[]>> {
    const embeddings = new Map<string, number[]>();
    
    if (users.length === 0) return embeddings;

    // Build texts for batch embedding
    const texts = users.map(u => ({
      email: u.email,
      text: this.buildUserPreferencesText(u.preferences)
    }));

    try {
      // Single API call for all users
      const response = await this.getOpenAIClient().embeddings.create({
        model: this.MODEL,
        input: texts.map(t => t.text),
      });

      // Map embeddings back to emails
      response.data.forEach((embedding, index) => {
        embeddings.set(texts[index].email, embedding.embedding);
      });
    } catch (error) {
      console.error('Batch user embedding generation failed:', error);
      // Return empty map - will fall back to heuristic grouping
    }

    return embeddings;
  }

  /**
   * Get user embedding from cache/database or generate new one
   * OPTIMIZED: Caches embeddings by hash(profile+skills) to skip duplicates
   */
  async getUserEmbeddingWithCache(
    userEmail: string,
    preferences: UserPreferences
  ): Promise<number[]> {
    // Generate hash of user preferences for cache key
    const prefsText = this.buildUserPreferencesText(preferences);
    const prefsHash = this.hashString(prefsText);
    
    // Check database first - look for user with matching hash
    try {
      const { data: user } = await this.supabase
        .from('users')
        .select('preference_embedding, preference_hash')
        .eq('email', userEmail)
        .single();

      // If embedding exists and hash matches, return cached embedding
      if (user?.preference_embedding && Array.isArray(user.preference_embedding)) {
        if (user.preference_hash === prefsHash) {
          console.log(`Cache hit: User ${userEmail} embedding (hash: ${prefsHash.substring(0, 8)})`);
          return user.preference_embedding;
        } else {
          console.log(`Cache miss: User ${userEmail} preferences changed (hash mismatch)`);
        }
      }
    } catch (error) {
      // If not found or error, continue to generate
    }

    // Generate and store if not found or hash changed
    const embedding = await this.generateUserEmbedding(preferences);
    await this.storeUserEmbedding(userEmail, embedding, prefsHash);
    
    return embedding;
  }

  /**
   * Simple hash function for preference text
   * Returns first 16 chars of SHA-256 hash
   */
  private hashString(text: string): string {
    const crypto = require('crypto');
    return crypto.createHash('sha256').update(text).digest('hex').substring(0, 16);
  }

  /**
   * Batch generate embeddings for multiple jobs
   * Returns map of job_hash -> embedding
   * ENHANCED: Logs token count and cost per batch for monitoring
   */
  async batchGenerateJobEmbeddings(jobs: Job[]): Promise<Map<string, number[]>> {
    const embeddings = new Map<string, number[]>();
    let totalTokens = 0;
    let totalCost = 0;
    const startTime = Date.now();
    
    // Process in batches
    for (let i = 0; i < jobs.length; i += this.BATCH_SIZE) {
      const batch = jobs.slice(i, i + this.BATCH_SIZE);
      
      const texts = batch.map(job => ({
        id: job.job_hash,
        text: this.buildJobText(job)
      }));

      try {
        const response = await this.getOpenAIClient().embeddings.create({
          model: this.MODEL,
          input: texts.map(t => t.text),
        });

        // Track token usage and cost
        const batchTokens = response.usage?.total_tokens || 0;
        totalTokens += batchTokens;
        // text-embedding-3-small: $0.02 per 1M tokens
        const batchCost = (batchTokens / 1_000_000) * 0.02;
        totalCost += batchCost;

        // Map embeddings back to job hashes
        response.data.forEach((embedding, index) => {
          embeddings.set(texts[index].id, embedding.embedding);
        });

        // Log batch metrics
        console.log(`Embedding batch ${Math.floor(i / this.BATCH_SIZE) + 1}: ${batch.length} jobs, ${batchTokens} tokens, $${batchCost.toFixed(6)}`);

        // Rate limiting: OpenAI allows 3000 RPM for embeddings
        if (i + this.BATCH_SIZE < jobs.length) {
          await new Promise(resolve => setTimeout(resolve, 100)); // 100ms delay between batches
        }
      } catch (error) {
        console.error(`Failed to generate embeddings for batch ${i}:`, error);
        // Continue with other batches
      }
    }

    // Log total metrics for this run
    const duration = Date.now() - startTime;
    console.log(`[EMBEDDING COST] ${embeddings.size} embeddings, ${totalTokens} total tokens, $${totalCost.toFixed(6)} total cost, ${duration}ms duration`);
    
    // Log to monitoring system (if available)
    try {
      const { BusinessMetrics } = await import('@/lib/monitoring');
      if (BusinessMetrics) {
        BusinessMetrics.recordAPICall(
          '/api/generate-embeddings',
          'POST',
          200,
          duration
        );
      }
    } catch {
      // Monitoring not available, continue
    }

    return embeddings;
  }

  /**
   * Store job embeddings in database using batch update
   * OPTIMIZED: Batch updates instead of individual updates
   */
  async storeJobEmbeddings(
    embeddings: Map<string, number[]>
  ): Promise<void> {
    if (embeddings.size === 0) return;

    // Update jobs individually (Supabase doesn't support batch update with different WHERE clauses)
    // But we can use Promise.all for parallel updates
    const entries = Array.from(embeddings.entries());
    const batchSize = 50; // Process 50 at a time in parallel
    
    let successCount = 0;
    let errorCount = 0;
    
    for (let i = 0; i < entries.length; i += batchSize) {
      const batch = entries.slice(i, i + batchSize);
      
      // Update each job individually but in parallel
      const updatePromises = batch.map(async ([jobHash, embedding]) => {
        try {
          const { error } = await this.supabase
            .from('jobs')
            .update({ 
              embedding: embedding // Pass as native array - Supabase/pgvector handles conversion
            })
            .eq('job_hash', jobHash);

          if (error) {
            console.error(`Failed to store embedding for job_hash ${jobHash.substring(0, 8)}...:`, error.message);
            return false;
          }
          return true;
        } catch (error) {
          console.error(`Error storing embedding for job_hash ${jobHash.substring(0, 8)}...:`, error);
          return false;
        }
      });

      const results = await Promise.all(updatePromises);
      successCount += results.filter(r => r).length;
      errorCount += results.filter(r => !r).length;
      
      // Log progress every batch
      if ((i + batchSize) % 500 === 0 || i + batchSize >= entries.length) {
        console.log(`  Stored ${successCount}/${entries.length} embeddings (${errorCount} errors)`);
      }
    }
    
    console.log(`✅ Successfully stored ${successCount} embeddings, ${errorCount} errors`);
  }

  /**
   * Store user preference embedding with hash for cache invalidation
   */
  async storeUserEmbedding(
    userEmail: string,
    embedding: number[],
    preferenceHash?: string
  ): Promise<void> {
    try {
      const updateData: any = { 
        preference_embedding: embedding // Pass as native array
      };
      
      if (preferenceHash) {
        updateData.preference_hash = preferenceHash;
      }
      
      await this.supabase
        .from('users')
        .update(updateData)
        .eq('email', userEmail);
    } catch (error) {
      console.error(`Failed to store user embedding for ${userEmail}:`, error);
    }
  }

  /**
   * Generate embedding for text using OpenAI
   */
  private async generateEmbedding(text: string): Promise<number[]> {
    try {
      const response = await this.getOpenAIClient().embeddings.create({
        model: this.MODEL,
        input: text.substring(0, 8000), // Truncate to max token limit
      });

      return response.data[0].embedding;
    } catch (error) {
      console.error('Failed to generate embedding:', error);
      throw error;
    }
  }

  /**
   * Build text representation of job for embedding
   */
  private buildJobText(job: Job): string {
    const parts: string[] = [];

    if (job.title) parts.push(`Title: ${job.title}`);
    if (job.company) parts.push(`Company: ${job.company}`);
    if (job.location) parts.push(`Location: ${job.location}`);
    if (job.city) parts.push(`City: ${job.city}`);
    if (job.country) parts.push(`Country: ${job.country}`);
    
    // Add categories as keywords
    if (job.categories && job.categories.length > 0) {
      parts.push(`Categories: ${job.categories.join(', ')}`);
    }

    // Add key parts of description (first 500 chars)
    if (job.description) {
      const desc = job.description.substring(0, 500);
      parts.push(`Description: ${desc}`);
    }

    // Add early career indicators
    if (job.is_graduate) parts.push('Graduate program');
    if (job.is_internship) parts.push('Internship');
    if (job.experience_required) {
      parts.push(`Experience: ${job.experience_required}`);
    }

    // Add language requirements
    if (job.language_requirements && job.language_requirements.length > 0) {
      parts.push(`Languages: ${job.language_requirements.join(', ')}`);
    }

    // Add work environment
    if (job.work_environment) {
      parts.push(`Work environment: ${job.work_environment}`);
    }

    return parts.join('. ');
  }

  /**
   * Build text representation of user preferences for embedding
   */
  private buildUserPreferencesText(prefs: UserPreferences): string {
    const parts: string[] = [];

    if (prefs.career_path && prefs.career_path.length > 0) {
      parts.push(`Career path: ${prefs.career_path.join(', ')}`);
    }

    if (prefs.roles_selected && prefs.roles_selected.length > 0) {
      parts.push(`Roles: ${prefs.roles_selected.join(', ')}`);
    }

    if (prefs.target_cities && prefs.target_cities.length > 0) {
      parts.push(`Target cities: ${prefs.target_cities.join(', ')}`);
    }

    if (prefs.work_environment) {
      parts.push(`Work environment: ${prefs.work_environment}`);
    }

    if (prefs.entry_level_preference) {
      parts.push(`Experience level: ${prefs.entry_level_preference}`);
    }

    if (prefs.company_types && prefs.company_types.length > 0) {
      parts.push(`Company types: ${prefs.company_types.join(', ')}`);
    }

    if (prefs.languages_spoken && prefs.languages_spoken.length > 0) {
      parts.push(`Languages: ${prefs.languages_spoken.join(', ')}`);
    }

    // Skills (optional field)
    if ((prefs as any).skills && Array.isArray((prefs as any).skills) && (prefs as any).skills.length > 0) {
      parts.push(`Skills: ${(prefs as any).skills.join(', ')}`);
    }

    return parts.join('. ');
  }

  /**
   * Check if embeddings are available for jobs
   */
  async checkEmbeddingCoverage(): Promise<{
    total: number;
    withEmbeddings: number;
    coverage: number;
  }> {
    const { count: total } = await this.supabase
      .from('jobs')
      .select('*', { count: 'exact', head: true })
      .eq('is_active', true);

    const { count: withEmbeddings } = await this.supabase
      .from('jobs')
      .select('*', { count: 'exact', head: true })
      .eq('is_active', true)
      .not('embedding', 'is', null);

    const coverage = total && total > 0 
      ? (withEmbeddings || 0) / total 
      : 0;

    return {
      total: total || 0,
      withEmbeddings: withEmbeddings || 0,
      coverage
    };
  }
}

// Export singleton instance (lazy initialization prevents build-time errors)
let embeddingServiceInstance: EmbeddingService | null = null;

export const embeddingService = (() => {
  if (!embeddingServiceInstance) {
    embeddingServiceInstance = new EmbeddingService();
  }
  return embeddingServiceInstance;
})();

