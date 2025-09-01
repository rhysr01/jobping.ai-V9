/**
 * AI Matching Service for JobPing Matching System
 * 
 * This service handles AI-powered job matching using OpenAI's GPT models,
 * including prompt building, response parsing, and fallback handling.
 */

import OpenAI from 'openai';
import { Job, UserPreferences, MatchResult, JobMatch, AIMatchResponse } from './types';
import { MATCHING_CONFIG } from '../config/matching';
import { 
  reqFirst, 
  toStringArray 
} from '../jobMatching';
import { ScoringService } from './scoring.service';

export class AIMatchingService {
  private config: typeof MATCHING_CONFIG;
  private scoringService: ScoringService;

  constructor(
    private openai: OpenAI,
    config = MATCHING_CONFIG
  ) {
    this.config = config;
    this.scoringService = new ScoringService(config);
  }

  /**
   * Perform enhanced AI matching for a user
   */
  async performEnhancedMatching(
    jobs: Job[],
    userPrefs: UserPreferences
  ): Promise<MatchResult[]> {
    try {
      // Build enhanced prompt with robust matching instructions
      const prompt = this.buildMatchingPrompt(jobs, userPrefs);
      
      const response = await this.openai.chat.completions.create({
        model: this.config.ai.model,
        messages: [{ role: 'user', content: prompt }],
        temperature: this.config.ai.temperature,
        max_tokens: this.config.ai.maxTokens,
      });
      
      const content = response.choices[0]?.message?.content;
      if (!content) {
        throw new Error('No content in OpenAI response');
      }
      
      // Parse AI response and convert to robust match format
      const aiMatches = this.parseAndValidateMatches(content, jobs);
      const robustMatches = this.convertToRobustMatches(aiMatches, userPrefs, jobs);
      
      return robustMatches;
      
    } catch (error) {
      console.error('AI matching failed:', error);
      throw error;
    }
  }

  /**
   * Build matching prompt for AI
   */
  buildMatchingPrompt(jobs: Job[], userPrefs: UserPreferences): string {
    const userCareerPath = reqFirst(Array.isArray(userPrefs.career_path) ? userPrefs.career_path : [userPrefs.career_path || '']);
    const topCities = (userPrefs.target_cities || []).slice(0, 3);
    const eligibilityNotes = userPrefs.entry_level_preference || 'entry-level';
    
    const jobList = jobs.map((job, index) => {
      const categories = job.categories?.join(', ') || '';
      const location = Array.isArray(job.location) ? job.location.join(', ') : job.location || '';
      return `${index + 1}. ${job.title} at ${job.company} (${location}) - Categories: ${categories}`;
    }).join('\n');

    return `You are an expert job matching assistant. Match the user to the best jobs from the list below.

USER PROFILE:
- Career Path: ${userCareerPath}
- Target Cities: ${topCities.join(', ')}
- Eligibility: ${eligibilityNotes}
- Professional Expertise: ${userPrefs.professional_expertise || 'Not specified'}
- Work Environment: ${userPrefs.work_environment || 'Not specified'}

AVAILABLE JOBS:
${jobList}

INSTRUCTIONS:
1. Analyze each job for relevance to the user's profile
2. Consider career path alignment, location preferences, and eligibility
3. Return exactly 5 matches in JSON format
4. Order by relevance (most relevant first)

RESPONSE FORMAT:
Return ONLY a valid JSON array of matches. No additional text.

Example format:
[
  {
    "job_index": 1,
    "match_score": 95,
    "match_reason": "Perfect career path match in target location",
    "confidence_score": 0.9
  }
]`;
  }

  /**
   * Parse and validate AI response
   */
  parseAndValidateMatches(response: string, jobs: Job[]): JobMatch[] {
    try {
      // Clean up response
      const cleanResponse = response
        .replace(/```json\n?/g, '')
        .replace(/```\n?/g, '')
        .trim();
      
      const matches = JSON.parse(cleanResponse);
      
      if (!Array.isArray(matches)) {
        throw new Error('Response is not an array');
      }
      
      // Validate and transform each match
      const validMatches = matches
        .filter(this.validateSingleMatch)
        .filter(match => match.job_index >= 1 && match.job_index <= jobs.length)
        .map(match => this.transformToJobMatch(match, jobs))
        .slice(0, 5); // Ensure max 5 matches
      
      return validMatches;
      
    } catch (error) {
      console.error('Failed to parse AI response:', error);
      console.error('Raw response:', response);
      throw new Error(`Parse error: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * Validate a single match from AI response
   */
  private validateSingleMatch(match: any): boolean {
    return (
      match &&
      typeof match.job_index === 'number' &&
      typeof match.match_score === 'number' &&
      typeof match.match_reason === 'string' &&
      typeof match.confidence_score === 'number' &&
      match.match_score >= 0 &&
      match.match_score <= 100 &&
      match.confidence_score >= 0 &&
      match.confidence_score <= 1
    );
  }

  /**
   * Transform AI match to JobMatch format
   */
  private transformToJobMatch(match: any, jobs: Job[]): JobMatch {
    const job = jobs[match.job_index - 1]; // Convert to 0-based index
    return {
      job_id: String(job.id),
      match_score: match.match_score,
      match_reason: match.match_reason,
      confidence_score: match.confidence_score
    };
  }

  /**
   * Convert AI matches to robust MatchResult format
   */
  convertToRobustMatches(
    aiMatches: JobMatch[], 
    userPrefs: UserPreferences, 
    jobs: Job[]
  ): MatchResult[] {
    const results: MatchResult[] = [];
    
    for (const aiMatch of aiMatches) {
      const job = jobs.find(j => String(j.id) === aiMatch.job_id);
      if (!job) continue;
      
      // Use scoring service to get detailed breakdown
      const scoreBreakdown = this.scoringService.calculateMatchScore(job, userPrefs);
      const explanation = this.scoringService.generateMatchExplanation(job, scoreBreakdown, userPrefs);
      
      results.push({
        job,
        match_score: aiMatch.match_score,
        match_reason: aiMatch.match_reason,
        match_quality: this.getQualityLabel(aiMatch.match_score),
        match_tags: explanation.tags,
        confidence_score: aiMatch.confidence_score,
        scoreBreakdown
      });
    }
    
    return results;
  }

  /**
   * Get quality label for a score
   */
  private getQualityLabel(score: number): string {
    const thresholds = this.config.scoring.thresholds;
    
    if (score >= thresholds.excellent) return 'excellent';
    if (score >= thresholds.good) return 'good';
    if (score >= thresholds.fair) return 'fair';
    return 'poor';
  }

  /**
   * Test AI connection
   */
  async testConnection(): Promise<boolean> {
    try {
      const response = await this.openai.chat.completions.create({
        model: this.config.ai.model,
        messages: [{ role: 'user', content: 'test' }],
        max_tokens: 1,
        temperature: 0
      });
      
      return !!response.choices[0]?.message?.content;
    } catch (error) {
      console.error('AI connection test failed:', error);
      return false;
    }
  }

  /**
   * Get AI matching statistics
   */
  getStats(): {
    model: string;
    maxTokens: number;
    temperature: number;
    timeout: number;
  } {
    return {
      model: this.config.ai.model,
      maxTokens: this.config.ai.maxTokens,
      temperature: this.config.ai.temperature,
      timeout: this.config.ai.timeout
    };
  }
}
