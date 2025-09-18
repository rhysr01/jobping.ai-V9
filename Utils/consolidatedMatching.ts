/**
 * CONSOLIDATED MATCHING SYSTEM
 * Replacing all AI emergency fixes with a single, stable implementation
 * Built on existing Jobping codebase - no hallucinations
 */

import OpenAI from 'openai';
import { createClient } from '@supabase/supabase-js';
import type { Job } from '../scrapers/types';
import { UserPreferences, JobMatch } from './matching/types';
import { AIMatchingCache } from './matching/ai-matching.service';
import { enhanceMatchingWithEmbeddings, createUserProfileEmbedding, createJobEmbedding } from './embeddingBoost';

// Consolidated AI timeout - increased to 20s for better reliability
const AI_TIMEOUT_MS = 20000;

interface ConsolidatedMatchResult {
  matches: JobMatch[];
  method: 'ai_success' | 'ai_timeout' | 'ai_failed' | 'rule_based';
  processingTime: number;
  confidence: number;
}

export class ConsolidatedMatchingEngine {
  private openai: OpenAI | null = null;
  private openai35: OpenAI | null = null;
  private costTracker = {
    gpt4: { calls: 0, tokens: 0, cost: 0 },
    gpt35: { calls: 0, tokens: 0, cost: 0 }
  };

  constructor(openaiApiKey?: string) {
    if (openaiApiKey) {
      this.openai = new OpenAI({ apiKey: openaiApiKey });
      this.openai35 = new OpenAI({ apiKey: openaiApiKey });
    }
  }

  /**
   * Main matching function - tries AI first, falls back gracefully
   */
  async performMatching(
    jobs: Job[],
    userPrefs: UserPreferences,
    forceRulesBased: boolean = false
  ): Promise<ConsolidatedMatchResult> {
    const startTime = Date.now();

    // Skip AI if explicitly disabled or no client available
    if (forceRulesBased || !this.openai) {
      const ruleMatches = this.performRuleBasedMatching(jobs, userPrefs);
      return {
        matches: ruleMatches,
        method: 'rule_based',
        processingTime: Date.now() - startTime,
        confidence: 0.8
      };
    }

    // Try AI matching with timeout
    try {
      const aiMatches = await this.performAIMatchingWithTimeout(jobs, userPrefs);
      if (aiMatches && aiMatches.length > 0) {
        return {
          matches: aiMatches,
          method: 'ai_success',
          processingTime: Date.now() - startTime,
          confidence: 0.9
        };
      }
    } catch (error) {
      console.warn('AI matching failed, falling back to rules:', error instanceof Error ? error.message : 'Unknown error');
    }

    // Fallback to rule-based matching
    const ruleMatches = this.performRuleBasedMatching(jobs, userPrefs);
    return {
      matches: ruleMatches,
      method: 'ai_failed',
      processingTime: Date.now() - startTime,
      confidence: 0.7
    };
  }

  /**
   * AI matching with proper timeout and stable prompt
   */
  private async performAIMatchingWithTimeout(
    jobs: Job[],
    userPrefs: UserPreferences
  ): Promise<JobMatch[]> {
    if (!this.openai || !this.openai35) throw new Error('OpenAI client not initialized');

    const timeoutPromise = new Promise<never>((_, reject) => {
      setTimeout(() => reject(new Error('AI_TIMEOUT')), AI_TIMEOUT_MS);
    });

    // Determine which model to use based on complexity
    const shouldUseGPT4 = this.shouldUseGPT4(jobs, userPrefs);
    const aiPromise = shouldUseGPT4 
      ? this.callOpenAIAPI(jobs, userPrefs, 'gpt-4')
      : this.callOpenAIAPI(jobs, userPrefs, 'gpt-3.5-turbo');

    try {
      return await Promise.race([aiPromise, timeoutPromise]);
    } catch (error) {
      if (error instanceof Error && error.message === 'AI_TIMEOUT') {
        console.warn(`AI matching timed out after ${AI_TIMEOUT_MS}ms`);
        return [];
      }
      throw error;
    }
  }

  /**
   * Smart routing: Use GPT-3.5 for simple cases, GPT-4 for complex ones
   */
  private shouldUseGPT4(jobs: Job[], userPrefs: UserPreferences): boolean {
    // Use GPT-3.5 for simple cases (70% of requests)
    const complexityScore = this.calculateComplexityScore(jobs, userPrefs);
    
    // Threshold: > 0.6 complexity = use GPT-4
    return complexityScore > 0.6;
  }

  /**
   * Calculate complexity score (0-1) to determine model choice
   */
  private calculateComplexityScore(jobs: Job[], userPrefs: UserPreferences): number {
    let score = 0;
    
    // Job count complexity (more jobs = more complex)
    if (jobs.length > 100) score += 0.3;
    else if (jobs.length > 50) score += 0.2;
    
    // User preference complexity
    const prefCount = Object.values(userPrefs).filter(v => v && v.length > 0).length;
    if (prefCount > 5) score += 0.2;
    else if (prefCount > 3) score += 0.1;
    
    // Career path complexity (multiple paths = more complex)
    if (userPrefs.career_path && userPrefs.career_path.length > 2) score += 0.2;
    
    // Location complexity (multiple cities = more complex)
    if (userPrefs.target_cities && userPrefs.target_cities.length > 3) score += 0.1;
    
    // Industry diversity (multiple industries = more complex)
    if (userPrefs.company_types && userPrefs.company_types.length > 2) score += 0.2;
    
    return Math.min(1, score);
  }

  /**
   * Stable OpenAI API call with function calling - no more parsing errors
   */
  private async callOpenAIAPI(jobs: Job[], userPrefs: UserPreferences, model: 'gpt-4' | 'gpt-3.5-turbo' = 'gpt-4'): Promise<JobMatch[]> {
    const client = model === 'gpt-4' ? this.openai : this.openai35;
    if (!client) throw new Error('OpenAI client not initialized');

    // Build optimized prompt based on model
    const prompt = this.buildStablePrompt(jobs, userPrefs);

    const completion = await client.chat.completions.create({
      model: model,
      messages: [
        {
          role: 'system',
          content: 'You analyze jobs and return match scores using the provided function.'
        },
        {
          role: 'user',
          content: prompt
        }
      ],
      temperature: 0.1, // Low temperature for consistency
      max_tokens: 500,   // Smaller limit to reduce costs
      functions: [{
        name: 'return_job_matches',
        description: 'Return job matches in structured format',
        parameters: {
          type: 'object',
          properties: {
            matches: {
              type: 'array',
              items: {
                type: 'object',
                properties: {
                  job_index: { type: 'number', minimum: 1 },
                  job_hash: { type: 'string' },
                  match_score: { type: 'number', minimum: 50, maximum: 100 },
                  match_reason: { type: 'string', maxLength: 200 }
                },
                required: ['job_index', 'job_hash', 'match_score', 'match_reason']
              }
            }
          },
          required: ['matches']
        }
      }],
      function_call: { name: 'return_job_matches' }
    });

    // Track costs (simplified for now)
    if (completion.usage) {
      const trackerKey = model === 'gpt-4' ? 'gpt4' : 'gpt35';
      this.costTracker[trackerKey].calls++;
      this.costTracker[trackerKey].tokens += completion.usage.total_tokens || 0;
    }

    const functionCall = completion.choices[0]?.message?.function_call;
    if (!functionCall || functionCall.name !== 'return_job_matches') {
      throw new Error('Invalid function call response');
    }

    try {
      const functionArgs = JSON.parse(functionCall.arguments);
      return this.parseFunctionCallResponse(functionArgs.matches, jobs);
    } catch (error) {
      throw new Error(`Failed to parse function call: ${error}`);
    }
  }

  /**
   * Stable prompt that works consistently - no more emergency fixes
   */
  private buildStablePrompt(jobs: Job[], userPrefs: UserPreferences): string {
    const userCities = Array.isArray(userPrefs.target_cities) 
      ? userPrefs.target_cities.join(', ') 
      : (userPrefs.target_cities || 'Europe');
    
    const userCareer = userPrefs.professional_expertise || 'Graduate';
    const userLevel = userPrefs.entry_level_preference || 'entry-level';

    const jobList = jobs.slice(0, 6).map((job, i) => 
      `${i+1}: ${job.title} at ${job.company} [${job.job_hash}]`
    ).join('\n');

    return `User seeks ${userLevel} ${userCareer} roles in ${userCities}.

Jobs:
${jobList}

Return JSON array with top 3 matches:
[{"job_index":1,"job_hash":"actual-hash","match_score":75,"match_reason":"Brief reason"}]

Requirements:
- job_index: 1-${jobs.length}
- match_score: 50-100
- Use actual job_hash from above
- Max 3 matches
- Valid JSON only`;
  }

  /**
   * Robust response parsing - handles common failure cases
   */
  private parseAIResponse(response: string, jobs: Job[]): JobMatch[] {
    try {
      // Clean common formatting issues
      let cleaned = response
        .replace(/```json\n?/gi, '')
        .replace(/```\n?/gi, '')
        .trim();

      // Extract JSON array if buried in text
      const jsonMatch = cleaned.match(/\[[\s\S]*?\]/);
      if (jsonMatch) {
        cleaned = jsonMatch[0];
      }

      const matches = JSON.parse(cleaned);
      
      if (!Array.isArray(matches)) {
        throw new Error('Response is not an array');
      }

      // Validate and clean matches
      return matches
        .filter(match => this.isValidMatch(match, jobs.length))
        .slice(0, 5) // Max 5 matches
        .map(match => ({
          job_index: match.job_index,
          job_hash: match.job_hash,
          match_score: Math.min(100, Math.max(50, match.match_score)),
          match_reason: match.match_reason || 'AI match',
          confidence_score: 0.8
        }));

    } catch (error) {
      console.error('Failed to parse AI response:', response.slice(0, 200));
      return []; // Return empty array to trigger fallback
    }
  }

  /**
   * Parse function call response - much more reliable than text parsing
   */
  private parseFunctionCallResponse(matches: any[], jobs: Job[]): JobMatch[] {
    try {
      if (!Array.isArray(matches)) {
        throw new Error('Response is not an array');
      }

      // Validate and clean matches
      return matches
        .filter(match => this.isValidMatch(match, jobs.length))
        .slice(0, 5) // Max 5 matches
        .map(match => ({
          job_index: match.job_index,
          job_hash: match.job_hash,
          match_score: Math.min(100, Math.max(50, match.match_score)),
          match_reason: match.match_reason || 'AI match',
          confidence_score: 0.8
        }));

    } catch (error) {
      console.error('Failed to parse function call response:', error);
      return [];
    }
  }

  /**
   * Validate individual match from AI response
   */
  private isValidMatch(match: any, maxJobIndex: number): boolean {
    return (
      match &&
      typeof match.job_index === 'number' &&
      typeof match.job_hash === 'string' &&
      typeof match.match_score === 'number' &&
      match.job_index >= 1 &&
      match.job_index <= maxJobIndex &&
      match.match_score >= 0 &&
      match.match_score <= 100 &&
      match.job_hash.length > 0
    );
  }

  /**
   * Enhanced rule-based matching with weighted linear scoring model
   */
  private performRuleBasedMatching(jobs: Job[], userPrefs: UserPreferences): JobMatch[] {
    const matches: JobMatch[] = [];
    const userCities = Array.isArray(userPrefs.target_cities) ? userPrefs.target_cities : [];
    const userCareer = userPrefs.professional_expertise || '';
    const userCareerPaths = Array.isArray(userPrefs.career_path) ? userPrefs.career_path : [];

    for (let i = 0; i < Math.min(jobs.length, 20); i++) {
      const job = jobs[i];
      const scoreResult = this.calculateWeightedScore(job, userPrefs, userCities, userCareer, userCareerPaths);
      
      // Only include matches above threshold (increased from 65 to 70 for better quality)
      if (scoreResult.score >= 70) {
        matches.push({
          job_index: i + 1,
          job_hash: job.job_hash,
          match_score: scoreResult.score,
          match_reason: scoreResult.reasons.join(', ') || 'Enhanced rule-based match',
          confidence_score: 0.7
        });
      }
    }

    // Apply embedding boost to enhance semantic matching
    const enhancedMatches = enhanceMatchingWithEmbeddings(
      jobs.slice(0, 20), // Use the same jobs we processed
      userPrefs,
      matches
    );

    // Sort by enhanced score and return top matches
    return enhancedMatches
      .sort((a, b) => b.match_score - a.match_score)
      .slice(0, 8); // Increased from 6 to 8 for better coverage
  }

  /**
   * Calculate weighted linear score with enhanced factors
   */
  private calculateWeightedScore(
    job: any, 
    userPrefs: UserPreferences, 
    userCities: string[], 
    userCareer: string,
    userCareerPaths: string[]
  ): { score: number; reasons: string[] } {
    let score = 45; // Base score (slightly reduced from 50)
    const reasons: string[] = [];
    
    const title = job.title?.toLowerCase() || '';
    const description = (job.description || '').toLowerCase();
    const company = (job.company || '').toLowerCase();
    const location = (job.location || '').toLowerCase();
    const jobText = `${title} ${description}`.toLowerCase();

    // 0. Cold-start rules for new users (Weight: 15%)
    const coldStartScore = this.calculateColdStartScore(jobText, title, userPrefs);
    score += coldStartScore.points;
    if (coldStartScore.points > 0) {
      reasons.push(coldStartScore.reason);
    }

    // 1. Early Career Detection (Weight: 30%)
    const earlyCareerScore = this.calculateEarlyCareerScore(jobText, title);
    score += earlyCareerScore.points;
    if (earlyCareerScore.points > 0) {
      reasons.push(earlyCareerScore.reason);
    }

    // 2. EU Location Match (Weight: 25%)
    const euLocationScore = this.calculateEULocationScore(location, userCities);
    score += euLocationScore.points;
    if (euLocationScore.points > 0) {
      reasons.push(euLocationScore.reason);
    }

    // 3. Skill/Career Overlap (Weight: 20%)
    const skillScore = this.calculateSkillOverlapScore(jobText, userCareer, userCareerPaths);
    score += skillScore.points;
    if (skillScore.points > 0) {
      reasons.push(skillScore.reason);
    }

    // 4. Company Tier/Quality (Weight: 15%)
    const companyScore = this.calculateCompanyTierScore(company, jobText);
    score += companyScore.points;
    if (companyScore.points > 0) {
      reasons.push(companyScore.reason);
    }

    // 5. Recency/Freshness (Weight: 10%)
    const recencyScore = this.calculateRecencyScore(job);
    score += recencyScore.points;
    if (recencyScore.points > 0) {
      reasons.push(recencyScore.reason);
    }

    return { score: Math.min(100, Math.max(0, score)), reasons };
  }

  /**
   * Calculate cold-start score for new users with programme keyword boosts
   */
  private calculateColdStartScore(jobText: string, title: string, userPrefs: UserPreferences): { points: number; reason: string } {
    // Detect if user is new (no explicit career preferences)
    const isNewUser = !userPrefs.professional_expertise && 
                     (!userPrefs.career_path || userPrefs.career_path.length === 0);

    if (!isNewUser) {
      return { points: 0, reason: '' };
    }

    // Cold-start boosts for new users
    const programmeKeywords = [
      'graduate scheme', 'graduate program', 'graduate programme', 'trainee program',
      'internship program', 'rotation program', 'campus recruiting', 'university',
      'entry level program', 'junior program', 'associate program', 'apprentice'
    ];

    // Check for programme keywords (strong signal for new users)
    for (const keyword of programmeKeywords) {
      if (jobText.includes(keyword)) {
        return { points: 15, reason: 'graduate programme' };
      }
    }

    // Check for structured early career roles
    const structuredRoles = [
      'graduate', 'intern', 'trainee', 'associate', 'entry level', 'junior',
      'campus hire', 'new grad', 'recent graduate'
    ];

    for (const role of structuredRoles) {
      if (title.includes(role)) {
        return { points: 10, reason: 'structured early-career role' };
      }
    }

    // Check for company size indicators (larger companies more likely to have programmes)
    const largeCompanyIndicators = [
      'multinational', 'fortune 500', 'ftse 100', 'dax 30', 'cac 40',
      'blue chip', 'established', 'leading', 'global'
    ];

    for (const indicator of largeCompanyIndicators) {
      if (jobText.includes(indicator)) {
        return { points: 5, reason: 'established company' };
      }
    }

    return { points: 0, reason: '' };
  }

  /**
   * Calculate early career relevance score
   */
  private calculateEarlyCareerScore(jobText: string, title: string): { points: number; reason: string } {
    // High-value early career indicators
    const highValueTerms = ['intern', 'internship', 'graduate', 'new grad', 'entry level', 'junior', 'trainee'];
    const mediumValueTerms = ['associate', 'assistant', 'coordinator', 'specialist', 'analyst'];
    const programmeTerms = ['programme', 'program', 'scheme', 'rotation', 'campus'];

    // Check for high-value terms (strong signal)
    for (const term of highValueTerms) {
      if (jobText.includes(term)) {
        return { points: 25, reason: 'early-career role' };
      }
    }

    // Check for medium-value terms
    for (const term of mediumValueTerms) {
      if (jobText.includes(term)) {
        return { points: 15, reason: 'entry-level position' };
      }
    }

    // Check for programme terms (graduate schemes, etc.)
    for (const term of programmeTerms) {
      if (jobText.includes(term)) {
        return { points: 20, reason: 'structured programme' };
      }
    }

    // Penalty for senior terms
    const seniorTerms = ['senior', 'staff', 'principal', 'lead', 'manager', 'director', 'head', 'vp', 'chief', 'executive'];
    for (const term of seniorTerms) {
      if (title.includes(term)) {
        return { points: -20, reason: 'senior role penalty' };
      }
    }

    return { points: 0, reason: '' };
  }

  /**
   * Calculate EU location relevance score
   */
  private calculateEULocationScore(location: string, userCities: string[]): { points: number; reason: string } {
    // EU countries and cities
    const euHints = [
      'uk', 'united kingdom', 'ireland', 'germany', 'france', 'spain', 'portugal', 'italy',
      'netherlands', 'belgium', 'luxembourg', 'denmark', 'sweden', 'norway', 'finland',
      'amsterdam', 'rotterdam', 'london', 'dublin', 'paris', 'berlin', 'munich',
      'madrid', 'barcelona', 'lisbon', 'milan', 'rome', 'stockholm', 'copenhagen'
    ];

    // Check for remote (penalty for now as per user preference)
    if (location.includes('remote') || location.includes('work from home')) {
      return { points: -10, reason: 'remote job penalty' };
    }

    // Check user's target cities first
    if (userCities.length > 0) {
      for (const city of userCities) {
        if (location.includes(city.toLowerCase())) {
          return { points: 20, reason: 'target city match' };
        }
      }
    }

    // Check for any EU location
    for (const hint of euHints) {
      if (location.includes(hint)) {
        return { points: 15, reason: 'EU location' };
      }
    }

    return { points: 0, reason: '' };
  }

  /**
   * Calculate skill/career overlap score with profile vectors lite
   */
  private calculateSkillOverlapScore(jobText: string, userCareer: string, userCareerPaths: string[]): { points: number; reason: string } {
    let maxScore = 0;
    let bestReason = '';

    // Profile vectors lite: Create user skill/industry/location vectors
    const userProfile = this.createUserProfileVector(userCareer, userCareerPaths);
    const jobProfile = this.createJobProfileVector(jobText);

    // Calculate overlap boost
    const overlapScore = this.calculateProfileOverlap(userProfile, jobProfile);
    if (overlapScore > 0) {
      maxScore = Math.max(maxScore, overlapScore);
      bestReason = `profile overlap (${overlapScore} points)`;
    }

    // Direct career match (keep existing logic as fallback)
    if (userCareer && jobText.includes(userCareer.toLowerCase())) {
      if (18 > maxScore) {
        maxScore = 18;
        bestReason = 'direct career match';
      }
    }

    // Career path matches
    for (const path of userCareerPaths) {
      if (jobText.includes(path.toLowerCase())) {
        if (18 > maxScore) {
          maxScore = 18;
          bestReason = 'career path match';
        }
      }
    }

    // Enhanced career mappings with more specific terms
    const careerMappings: Record<string, string[]> = {
      'software': ['developer', 'engineer', 'programmer', 'software', 'frontend', 'backend', 'full stack', 'mobile'],
      'data': ['analyst', 'data', 'analytics', 'data science', 'machine learning', 'ai', 'business intelligence'],
      'marketing': ['marketing', 'brand', 'digital', 'content', 'social media', 'growth', 'product marketing'],
      'sales': ['sales', 'business development', 'account', 'revenue', 'partnerships', 'commercial'],
      'consulting': ['consultant', 'advisory', 'strategy', 'management consulting', 'business analysis'],
      'finance': ['finance', 'financial', 'accounting', 'investment', 'banking', 'trading', 'risk'],
      'product': ['product', 'product management', 'product owner', 'product analyst', 'product designer'],
      'design': ['designer', 'design', 'ui', 'ux', 'graphic', 'visual', 'user experience'],
      'operations': ['operations', 'operational', 'process', 'supply chain', 'logistics', 'project management']
    };

    for (const [career, keywords] of Object.entries(careerMappings)) {
      const careerLower = userCareer.toLowerCase();
      if (careerLower.includes(career)) {
        const matchCount = keywords.filter(kw => jobText.includes(kw)).length;
        if (matchCount > 0) {
          const score = Math.min(15, 5 + (matchCount * 3));
          if (score > maxScore) {
            maxScore = score;
            bestReason = `${career} alignment (${matchCount} keywords)`;
          }
        }
      }
    }

    return { points: maxScore, reason: bestReason };
  }

  /**
   * Create user profile vector (skills/industries/locations as sets)
   */
  private createUserProfileVector(userCareer: string, userCareerPaths: string[]): {
    skills: Set<string>;
    industries: Set<string>;
    locations: Set<string>;
  } {
    const skills = new Set<string>();
    const industries = new Set<string>();
    const locations = new Set<string>();

    // Add career expertise as skills
    if (userCareer) {
      const careerLower = userCareer.toLowerCase();
      skills.add(careerLower);
      
      // Map career to related skills
      const careerToSkills: Record<string, string[]> = {
        'software': ['programming', 'development', 'coding', 'engineering'],
        'data': ['analytics', 'statistics', 'machine learning', 'sql', 'python'],
        'marketing': ['digital marketing', 'content creation', 'social media', 'branding'],
        'sales': ['relationship building', 'negotiation', 'lead generation', 'CRM'],
        'consulting': ['problem solving', 'strategic thinking', 'presentation', 'analysis'],
        'finance': ['financial modeling', 'accounting', 'investment analysis', 'risk assessment'],
        'product': ['product strategy', 'user research', 'roadmapping', 'stakeholder management'],
        'design': ['user experience', 'visual design', 'prototyping', 'design thinking'],
        'operations': ['process improvement', 'project management', 'supply chain', 'logistics']
      };

      for (const [career, relatedSkills] of Object.entries(careerToSkills)) {
        if (careerLower.includes(career)) {
          relatedSkills.forEach(skill => skills.add(skill));
        }
      }
    }

    // Add career paths as industries
    userCareerPaths.forEach(path => {
      const pathLower = path.toLowerCase();
      industries.add(pathLower);
    });

    return { skills, industries, locations };
  }

  /**
   * Create job profile vector from job text
   */
  private createJobProfileVector(jobText: string): {
    skills: Set<string>;
    industries: Set<string>;
    locations: Set<string>;
  } {
    const skills = new Set<string>();
    const industries = new Set<string>();
    const locations = new Set<string>();

    // Extract skills from job text
    const skillKeywords = [
      'programming', 'development', 'coding', 'engineering', 'analytics', 'statistics',
      'machine learning', 'sql', 'python', 'javascript', 'react', 'node', 'aws',
      'digital marketing', 'content creation', 'social media', 'branding',
      'relationship building', 'negotiation', 'lead generation', 'CRM',
      'problem solving', 'strategic thinking', 'presentation', 'analysis',
      'financial modeling', 'accounting', 'investment analysis', 'risk assessment',
      'product strategy', 'user research', 'roadmapping', 'stakeholder management',
      'user experience', 'visual design', 'prototyping', 'design thinking',
      'process improvement', 'project management', 'supply chain', 'logistics'
    ];

    skillKeywords.forEach(skill => {
      if (jobText.includes(skill)) {
        skills.add(skill);
      }
    });

    // Extract industries from job text
    const industryKeywords = [
      'technology', 'fintech', 'healthcare', 'e-commerce', 'consulting', 'finance',
      'marketing', 'advertising', 'media', 'entertainment', 'retail', 'manufacturing',
      'automotive', 'aerospace', 'energy', 'real estate', 'education', 'government'
    ];

    industryKeywords.forEach(industry => {
      if (jobText.includes(industry)) {
        industries.add(industry);
      }
    });

    return { skills, industries, locations };
  }

  /**
   * Calculate profile overlap boost (≥2 overlaps = boost)
   */
  private calculateProfileOverlap(
    userProfile: { skills: Set<string>; industries: Set<string>; locations: Set<string> },
    jobProfile: { skills: Set<string>; industries: Set<string>; locations: Set<string> }
  ): number {
    let overlapCount = 0;

    // Count skill overlaps
    for (const userSkill of userProfile.skills) {
      if (jobProfile.skills.has(userSkill)) {
        overlapCount++;
      }
    }

    // Count industry overlaps
    for (const userIndustry of userProfile.industries) {
      if (jobProfile.industries.has(userIndustry)) {
        overlapCount++;
      }
    }

    // Count location overlaps
    for (const userLocation of userProfile.locations) {
      if (jobProfile.locations.has(userLocation)) {
        overlapCount++;
      }
    }

    // Boost if ≥2 overlaps
    if (overlapCount >= 2) {
      return Math.min(20, 5 + (overlapCount * 2)); // 7-20 points based on overlap count
    }

    return 0;
  }

  /**
   * Calculate company tier/quality score
   */
  private calculateCompanyTierScore(company: string, jobText: string): { points: number; reason: string } {
    // Tier 1 companies (known tech/consulting/finance)
    const tier1Companies = [
      'google', 'microsoft', 'apple', 'amazon', 'meta', 'netflix', 'spotify', 'uber', 'airbnb',
      'mckinsey', 'bain', 'bcg', 'deloitte', 'pwc', 'ey', 'kpmg',
      'goldman sachs', 'jpmorgan', 'morgan stanley', 'blackrock'
    ];

    // Tier 2 companies (strong EU players)
    const tier2Companies = [
      'klarna', 'spotify', 'zalando', 'delivery hero', 'hellofresh', 'n26', 'revolut',
      'sap', 'siemens', 'bosch', 'adidas', 'bmw', 'mercedes', 'volkswagen'
    ];

    // Check tier 1
    for (const tier1 of tier1Companies) {
      if (company.includes(tier1)) {
        return { points: 12, reason: 'tier-1 company' };
      }
    }

    // Check tier 2
    for (const tier2 of tier2Companies) {
      if (company.includes(tier2)) {
        return { points: 8, reason: 'tier-2 company' };
      }
    }

    // Startup/scaleup indicators
    const startupIndicators = ['startup', 'scaleup', 'series a', 'series b', 'unicorn', 'venture'];
    for (const indicator of startupIndicators) {
      if (jobText.includes(indicator)) {
        return { points: 6, reason: 'startup/scaleup' };
      }
    }

    // Company size indicators
    if (company.length > 3 && !company.includes('ltd') && !company.includes('inc')) {
      return { points: 3, reason: 'established company' };
    }

    return { points: 0, reason: '' };
  }

  /**
   * Calculate recency/freshness score
   */
  private calculateRecencyScore(job: any): { points: number; reason: string } {
    const postedDate = job.original_posted_date || job.created_at;
    if (!postedDate) return { points: 0, reason: '' };

    const daysOld = (Date.now() - new Date(postedDate).getTime()) / (1000 * 60 * 60 * 24);
    
    if (daysOld < 1) return { points: 10, reason: 'posted today' };
    if (daysOld < 3) return { points: 8, reason: 'posted this week' };
    if (daysOld < 7) return { points: 6, reason: 'posted recently' };
    if (daysOld < 14) return { points: 4, reason: 'posted within 2 weeks' };
    if (daysOld < 28) return { points: 2, reason: 'posted this month' };
    
    return { points: 0, reason: '' };
  }

  /**
   * Get quality label based on score
   */
  private getQualityLabel(score: number): string {
    if (score >= 85) return 'excellent';
    if (score >= 75) return 'good';
    if (score >= 65) return 'fair';
    return 'poor';
  }

  /**
   * Test AI connection
   */
  async testConnection(): Promise<boolean> {
    if (!this.openai) return false;
    
    try {
      const response = await this.openai.chat.completions.create({
        model: 'gpt-3.5-turbo',
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
}

// Export factory function for easy integration
export function createConsolidatedMatcher(openaiApiKey?: string): ConsolidatedMatchingEngine {
  return new ConsolidatedMatchingEngine(openaiApiKey);
}
