/**
 * Embedding Service
 * Generates and manages vector embeddings for jobs and users
 */

import OpenAI from 'openai';
import { getDatabaseClient } from '@/Utils/databasePool';
import type { Job } from '@/scrapers/types';
import type { UserPreferences } from './types';

export class EmbeddingService {
  private openai: OpenAI;
  private supabase = getDatabaseClient();
  private readonly MODEL = 'text-embedding-3-small'; // 1536 dimensions, cheapest
  private readonly BATCH_SIZE = 100; // OpenAI allows up to 2048 per batch

  constructor() {
    if (!process.env.OPENAI_API_KEY) {
      throw new Error('OPENAI_API_KEY not configured');
    }
    this.openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });
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
      const response = await this.openai.embeddings.create({
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
   * OPTIMIZED: Caches embeddings to avoid regeneration
   */
  async getUserEmbeddingWithCache(
    userEmail: string,
    preferences: UserPreferences
  ): Promise<number[]> {
    // Check database first
    try {
      const { data: user } = await this.supabase
        .from('users')
        .select('preference_embedding')
        .eq('email', userEmail)
        .single();

      if (user?.preference_embedding && Array.isArray(user.preference_embedding)) {
        return user.preference_embedding;
      }
    } catch (error) {
      // If not found or error, continue to generate
    }

    // Generate and store if not found
    const embedding = await this.generateUserEmbedding(preferences);
    await this.storeUserEmbedding(userEmail, embedding);
    
    return embedding;
  }

  /**
   * Batch generate embeddings for multiple jobs
   * Returns map of job_hash -> embedding
   */
  async batchGenerateJobEmbeddings(jobs: Job[]): Promise<Map<string, number[]>> {
    const embeddings = new Map<string, number[]>();
    
    // Process in batches
    for (let i = 0; i < jobs.length; i += this.BATCH_SIZE) {
      const batch = jobs.slice(i, i + this.BATCH_SIZE);
      
      const texts = batch.map(job => ({
        id: job.job_hash,
        text: this.buildJobText(job)
      }));

      try {
        const response = await this.openai.embeddings.create({
          model: this.MODEL,
          input: texts.map(t => t.text),
        });

        // Map embeddings back to job hashes
        response.data.forEach((embedding, index) => {
          embeddings.set(texts[index].id, embedding.embedding);
        });

        // Rate limiting: OpenAI allows 3000 RPM for embeddings
        if (i + this.BATCH_SIZE < jobs.length) {
          await new Promise(resolve => setTimeout(resolve, 100)); // 100ms delay between batches
        }
      } catch (error) {
        console.error(`Failed to generate embeddings for batch ${i}:`, error);
        // Continue with other batches
      }
    }

    return embeddings;
  }

  /**
   * Store job embeddings in database using batch upsert
   * OPTIMIZED: Single batch upsert instead of individual updates
   */
  async storeJobEmbeddings(
    embeddings: Map<string, number[]>
  ): Promise<void> {
    if (embeddings.size === 0) return;

    // Update jobs in batches using upsert
    const batchSize = 100;
    const entries = Array.from(embeddings.entries());
    
    for (let i = 0; i < entries.length; i += batchSize) {
      const batch = entries.slice(i, i + batchSize);
      
      // Prepare batch with proper vector format (native array)
      const updates = batch.map(([jobHash, embedding]) => ({
        job_hash: jobHash,
        embedding: embedding // Pass as native array - Supabase handles conversion
      }));

      try {
        // Single batch upsert - much faster than individual updates
        const { error } = await this.supabase
          .from('jobs')
          .upsert(updates, { 
            onConflict: 'job_hash',
            ignoreDuplicates: false 
          });

        if (error) {
          console.error(`Failed to store embedding batch ${i}:`, error);
          // Continue with other batches instead of failing completely
        }
      } catch (error) {
        console.error(`Error storing embedding batch ${i}:`, error);
      }
    }
  }

  /**
   * Store user preference embedding
   */
  async storeUserEmbedding(
    userEmail: string,
    embedding: number[]
  ): Promise<void> {
    try {
      await this.supabase
        .from('users')
        .update({ 
          preference_embedding: embedding // Pass as native array
        })
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
      const response = await this.openai.embeddings.create({
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

// Export singleton instance
export const embeddingService = new EmbeddingService();

