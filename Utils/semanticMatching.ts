/* ============================
   Semantic Matching System
   Uses embeddings for true understanding of job-user similarity
   ============================ */

import OpenAI from 'openai';
import { createClient } from '@supabase/supabase-js';

interface SemanticMatch {
  job_hash: string;
  semantic_score: number;
  skill_alignment: number;
  career_progression: number;
  cultural_fit: number;
  explanation: string;
}

interface UserSemanticProfile {
  skills: string[];
  experience_level: string;
  career_goals: string[];
  preferred_industries: string[];
  work_style: string;
  location_preferences: string[];
  languages: string[];
  work_authorization: string;
  target_start_date: string;
  roles_selected: any;
  professional_experience: string;
}

export class SemanticMatchingEngine {
  private openai: OpenAI;
  private supabase: any;
  private embeddingCache: Map<string, { embedding: number[], timestamp: number }>;
  private cacheExpiryMs: number = 24 * 60 * 60 * 1000; // 24 hours

  constructor(openai: OpenAI, supabaseUrl: string, supabaseKey: string) {
    this.openai = openai;
    this.supabase = createClient(supabaseUrl, supabaseKey);
    this.embeddingCache = new Map();
  }

  /**
   * Generate semantic embeddings for text with caching
   */
  private async generateEmbedding(text: string): Promise<number[]> {
    const cacheKey = this.hashText(text);
    const cached = this.embeddingCache.get(cacheKey);
    
    // Check if we have a valid cached embedding
    if (cached && (Date.now() - cached.timestamp) < this.cacheExpiryMs) {
      console.log('📦 Using cached embedding');
      return cached.embedding;
    }
    
    // Generate new embedding
    console.log('🔄 Generating new embedding');
    const response = await this.openai.embeddings.create({
      model: 'text-embedding-3-small',
      input: text,
      dimensions: 1536
    });
    
    const embedding = response.data[0].embedding;
    
    // Cache the new embedding
    this.embeddingCache.set(cacheKey, {
      embedding,
      timestamp: Date.now()
    });
    
    // Clean up old cache entries if cache gets too large
    this.cleanupCache();
    
    return embedding;
  }

  /**
   * Simple hash function for text
   */
  private hashText(text: string): string {
    let hash = 0;
    for (let i = 0; i < text.length; i++) {
      const char = text.charCodeAt(i);
      hash = ((hash << 5) - hash) + char;
      hash = hash & hash; // Convert to 32-bit integer
    }
    return hash.toString();
  }

  /**
   * Clean up old cache entries to prevent memory bloat
   */
  private cleanupCache(): void {
    const now = Date.now();
    const maxCacheSize = 1000; // Maximum cache entries
    
    if (this.embeddingCache.size > maxCacheSize) {
      const entries = Array.from(this.embeddingCache.entries());
      entries.sort((a, b) => a[1].timestamp - b[1].timestamp);
      
      // Remove oldest entries
      const toRemove = entries.slice(0, entries.length - maxCacheSize + 100);
      toRemove.forEach(([key]) => this.embeddingCache.delete(key));
      
      console.log(`🧹 Cleaned up ${toRemove.length} old cache entries`);
    }
  }

  /**
   * Get cache statistics
   */
  public getCacheStats(): { size: number, hitRate: number, oldestEntry: number } {
    const now = Date.now();
    const entries = Array.from(this.embeddingCache.values());
    const oldestEntry = entries.length > 0 ? Math.min(...entries.map(e => e.timestamp)) : 0;
    
    return {
      size: this.embeddingCache.size,
      hitRate: 0, // Would need to track hits/misses for accurate rate
      oldestEntry: oldestEntry > 0 ? now - oldestEntry : 0
    };
  }

  /**
   * Calculate cosine similarity between two vectors
   */
  private cosineSimilarity(vecA: number[], vecB: number[]): number {
    if (vecA.length !== vecB.length) return 0;
    
    let dotProduct = 0;
    let normA = 0;
    let normB = 0;
    
    for (let i = 0; i < vecA.length; i++) {
      dotProduct += vecA[i] * vecB[i];
      normA += vecA[i] * vecA[i];
      normB += vecB[i] * vecB[i];
    }
    
    return dotProduct / (Math.sqrt(normA) * Math.sqrt(normB));
  }

  /**
   * Enhanced user profile extraction using ALL rich user data
   */
  async extractUserSemanticProfile(userPrefs: any): Promise<UserSemanticProfile> {
    // Use ALL your rich user data for better semantic understanding
    const profileText = `
      Skills: ${userPrefs.professional_expertise || 'entry-level'}
      Experience: ${userPrefs.entry_level_preference || 'graduate'}
      Career Goals: ${userPrefs.career_path?.join(', ') || 'general'}
      Industries: ${userPrefs.company_types?.join(', ') || 'any'}
      Work Style: ${userPrefs.work_environment || 'flexible'}
      Locations: ${userPrefs.target_cities?.join(', ') || 'any'}
      Languages: ${userPrefs.languages_spoken?.join(', ') || 'any'}
      Work Authorization: ${userPrefs.work_authorization || 'any'}
      Target Start Date: ${userPrefs.target_employment_start_date || 'flexible'}
      Professional Experience: ${userPrefs.professional_experience || 'entry-level'}
      Roles: ${JSON.stringify(userPrefs.roles_selected || {})}
    `;

    // Generate embedding for comprehensive user profile
    const userEmbedding = await this.generateEmbedding(profileText);

    return {
      skills: userPrefs.professional_expertise ? [userPrefs.professional_expertise] : [],
      experience_level: userPrefs.entry_level_preference || 'entry-level',
      career_goals: userPrefs.career_path || [],
      preferred_industries: userPrefs.company_types || [],
      work_style: userPrefs.work_environment || 'flexible',
      location_preferences: userPrefs.target_cities || [],
      languages: userPrefs.languages_spoken || [],
      work_authorization: userPrefs.work_authorization || 'any',
      target_start_date: userPrefs.target_employment_start_date || 'flexible',
      roles_selected: userPrefs.roles_selected || {},
      professional_experience: userPrefs.professional_experience || 'entry-level'
    };
  }

  /**
   * Enhanced job semantic profile with better feature extraction
   */
  private async generateJobSemanticProfile(job: any): Promise<string> {
    // Extract key semantic features for better matching
    const skills = await this.extractSkillsFromJob(job);
    const industry = this.inferIndustry(job);
    const companySize = this.inferCompanySize(job.company);
    const roleLevel = this.inferRoleLevel(job.title, job.description);
    
    return `
      Title: ${job.title}
      Company: ${job.company} (${companySize})
      Industry: ${industry}
      Role Level: ${roleLevel}
      Skills Required: ${skills.join(', ')}
      Description: ${job.description}
      Location: ${job.location}
      Job Type: ${this.inferJobType(job.title, job.description)}
      Required Experience: ${this.inferRequiredExperience(job.title, job.description)}
    `;
  }

  /**
   * Enhanced skill extraction using AI for better understanding
   */
  private async extractSkillsFromJob(job: any): Promise<string[]> {
    try {
      const prompt = `Extract the key technical skills and requirements from this job posting. Return only a comma-separated list of skills, no explanations:

Title: ${job.title}
Company: ${job.company}
Description: ${job.description}

Skills:`;

      const response = await this.openai.chat.completions.create({
        model: 'gpt-3.5-turbo',
        messages: [{ role: 'user', content: prompt }],
        temperature: 0.1,
        max_tokens: 100
      });

      const skillsText = response.choices[0]?.message?.content || '';
      return skillsText.split(',').map(s => s.trim()).filter(s => s.length > 0);
    } catch (error) {
      console.warn('AI skill extraction failed, using fallback:', error);
      // Fallback to basic keyword extraction
      return this.extractSkillsFallback(job);
    }
  }

  /**
   * Fallback skill extraction using keyword matching
   */
  private extractSkillsFallback(job: any): string[] {
    const commonSkills = [
      'javascript', 'python', 'java', 'react', 'node.js', 'sql', 'aws', 'docker',
      'machine learning', 'data analysis', 'product management', 'ui/ux',
      'agile', 'scrum', 'git', 'rest api', 'graphql', 'typescript'
    ];
    
    const jobText = `${job.title} ${job.description}`.toLowerCase();
    return commonSkills.filter(skill => jobText.includes(skill));
  }

  /**
   * Enhanced industry inference with better categorization
   */
  public inferIndustry(job: any): string {
    const title = job.title.toLowerCase();
    const description = job.description.toLowerCase();
    const company = job.company.toLowerCase();
    
    // Enhanced industry detection
    if (title.includes('software') || title.includes('developer') || title.includes('engineer') || 
        description.includes('software') || description.includes('coding') || description.includes('programming')) {
      return 'Technology';
    }
    
    if (title.includes('data') || title.includes('analyst') || title.includes('scientist') ||
        description.includes('data') || description.includes('analytics') || description.includes('machine learning')) {
      return 'Data & Analytics';
    }
    
    if (title.includes('product') || title.includes('manager') || title.includes('associate') ||
        description.includes('product') || description.includes('strategy') || description.includes('business')) {
      return 'Product & Business';
    }
    
    if (title.includes('design') || title.includes('ux') || title.includes('ui') ||
        description.includes('design') || description.includes('user experience')) {
      return 'Design & UX';
    }
    
    if (title.includes('marketing') || title.includes('sales') ||
        description.includes('marketing') || description.includes('sales')) {
      return 'Marketing & Sales';
    }
    
    if (title.includes('finance') || title.includes('accounting') ||
        description.includes('finance') || description.includes('accounting')) {
      return 'Finance & Accounting';
    }
    
    return 'Other';
  }

  /**
   * Enhanced company size inference
   */
  public inferCompanySize(company: string): string {
    const companyLower = company.toLowerCase();
    
    // More sophisticated company size detection
    if (companyLower.includes('startup') || companyLower.includes('incubator') || 
        companyLower.includes('accelerator') || companyLower.includes('early-stage')) {
      return 'Startup';
    }
    
    if (companyLower.includes('agency') || companyLower.includes('consulting') ||
        companyLower.includes('boutique') || companyLower.includes('small')) {
      return 'Small';
    }
    
    if (companyLower.includes('corp') || companyLower.includes('ltd') || 
        companyLower.includes('plc') || companyLower.includes('group')) {
      return 'Medium-Large';
    }
    
    if (companyLower.includes('microsoft') || companyLower.includes('google') || 
        companyLower.includes('amazon') || companyLower.includes('apple') ||
        companyLower.includes('meta') || companyLower.includes('netflix')) {
      return 'Enterprise';
    }
    
    return 'Unknown';
  }

  /**
   * Enhanced role level inference
   */
  public inferRoleLevel(title: string, description: string): string {
    const titleLower = title.toLowerCase();
    const descLower = description.toLowerCase();
    
    // More sophisticated level detection
    if (titleLower.includes('senior') || titleLower.includes('lead') || 
        titleLower.includes('principal') || titleLower.includes('staff') ||
        descLower.includes('senior') || descLower.includes('lead') || descLower.includes('5+ years')) {
      return 'senior';
    }
    
    if (titleLower.includes('mid') || titleLower.includes('intermediate') ||
        descLower.includes('mid-level') || descLower.includes('2-5 years') ||
        descLower.includes('3+ years')) {
      return 'mid';
    }
    
    if (titleLower.includes('junior') || titleLower.includes('entry') || 
        titleLower.includes('graduate') || titleLower.includes('associate') ||
        descLower.includes('junior') || descLower.includes('entry-level') || 
        descLower.includes('0-2 years') || descLower.includes('recent graduate')) {
      return 'entry';
    }
    
    return 'entry'; // Default for graduate jobs
  }

  /**
   * Infer job type (full-time, part-time, contract, etc.)
   */
  public inferJobType(title: string, description: string): string {
    const text = `${title} ${description}`.toLowerCase();
    
    if (text.includes('part-time') || text.includes('part time')) return 'Part-time';
    if (text.includes('contract') || text.includes('freelance')) return 'Contract';
    if (text.includes('internship') || text.includes('intern')) return 'Internship';
    if (text.includes('graduate') || text.includes('entry-level')) return 'Graduate';
    
    return 'Full-time';
  }

  /**
   * Infer required experience level
   */
  public inferRequiredExperience(title: string, description: string): string {
    const text = `${title} ${description}`.toLowerCase();
    
    if (text.includes('0-1 years') || text.includes('no experience') || text.includes('recent graduate')) {
      return '0-1 years';
    }
    if (text.includes('1-2 years') || text.includes('entry level')) {
      return '1-2 years';
    }
    if (text.includes('2-5 years') || text.includes('mid level')) {
      return '2-5 years';
    }
    if (text.includes('5+ years') || text.includes('senior')) {
      return '5+ years';
    }
    
    return '0-1 years'; // Default for graduate jobs
  }

  /**
   * Perform semantic matching between user and jobs with batch processing
   */
  async performSemanticMatching(
    userPrefs: any,
    jobs: any[],
    maxResults: number = 10,
    batchSize: number = 50
  ): Promise<SemanticMatch[]> {
    try {
      // Extract enhanced user semantic profile
      const userProfile = await this.extractUserSemanticProfile(userPrefs);
      const userEmbedding = await this.generateEmbedding(JSON.stringify(userProfile));

      // Process jobs in batches for efficiency
      const semanticMatches: SemanticMatch[] = [];
      
      for (let i = 0; i < jobs.length; i += batchSize) {
        const batch = jobs.slice(i, i + batchSize);
        console.log(`🔄 Processing batch ${Math.floor(i / batchSize) + 1}/${Math.ceil(jobs.length / batchSize)} (${batch.length} jobs)`);
        
        // Generate semantic profiles for batch
        const batchSemanticProfiles = await Promise.all(
          batch.map(async (job) => {
            const semanticProfile = await this.generateJobSemanticProfile(job);
            const jobEmbedding = await this.generateEmbedding(semanticProfile);
            
            return {
              job,
              semanticProfile,
              embedding: jobEmbedding
            };
          })
        );

        // Calculate semantic similarities for batch
        const batchMatches = batchSemanticProfiles.map(({ job, embedding }) => {
          const semanticScore = this.cosineSimilarity(userEmbedding, embedding);
          
          // Calculate enhanced semantic metrics
          const skillAlignment = this.calculateSkillAlignment(userProfile, job);
          const careerProgression = this.calculateCareerProgression(userProfile, job);
          const culturalFit = this.calculateCulturalFit(userProfile, job);

          // Enhanced combined semantic score with better weighting
          const combinedScore = (
            semanticScore * 0.4 +
            skillAlignment * 0.3 +
            careerProgression * 0.2 +
            culturalFit * 0.1
          );

          return {
            job_hash: job.job_hash,
            semantic_score: combinedScore,
            skill_alignment: skillAlignment,
            career_progression: careerProgression,
            cultural_fit: culturalFit,
            explanation: this.generateSemanticExplanation(userProfile, job, combinedScore)
          };
        });

        semanticMatches.push(...batchMatches);
        
        // Log batch progress
        const avgScore = batchMatches.reduce((sum, m) => sum + m.semantic_score, 0) / batchMatches.length;
        console.log(`   ✅ Batch completed - Average score: ${(avgScore * 100).toFixed(1)}%`);
      }

      // Sort by semantic score and return top results
      return semanticMatches
        .sort((a, b) => b.semantic_score - a.semantic_score)
        .slice(0, maxResults);

    } catch (error) {
      console.error('Enhanced semantic matching failed:', error);
      return [];
    }
  }

  /**
   * Batch process multiple user profiles against a single job (for job recommendations)
   */
  async batchMatchJobToUsers(
    job: any,
    userProfiles: any[],
    batchSize: number = 20
  ): Promise<Array<{ userEmail: string, matchScore: number, explanation: string }>> {
    try {
      console.log(`🔄 Batch matching job "${job.title}" to ${userProfiles.length} users`);
      
      // Generate job semantic profile once
      const jobSemanticProfile = await this.generateJobSemanticProfile(job);
      const jobEmbedding = await this.generateEmbedding(jobSemanticProfile);
      
      const matches: Array<{ userEmail: string, matchScore: number, explanation: string }> = [];
      
      // Process users in batches
      for (let i = 0; i < userProfiles.length; i += batchSize) {
        const batch = userProfiles.slice(i, i + batchSize);
        console.log(`   Processing user batch ${Math.floor(i / batchSize) + 1}/${Math.ceil(userProfiles.length / batchSize)}`);
        
        const batchMatches = await Promise.all(
          batch.map(async (userProfile) => {
            const userSemanticProfile = await this.extractUserSemanticProfile(userProfile);
            const userEmbedding = await this.generateEmbedding(JSON.stringify(userSemanticProfile));
            
            const semanticScore = this.cosineSimilarity(userEmbedding, jobEmbedding);
            const skillAlignment = this.calculateSkillAlignment(userSemanticProfile, job);
            const careerProgression = this.calculateCareerProgression(userSemanticProfile, job);
            const culturalFit = this.calculateCulturalFit(userSemanticProfile, job);
            
            const combinedScore = (
              semanticScore * 0.4 +
              skillAlignment * 0.3 +
              careerProgression * 0.2 +
              culturalFit * 0.1
            );
            
            return {
              userEmail: userProfile.email,
              matchScore: combinedScore,
              explanation: this.generateSemanticExplanation(userSemanticProfile, job, combinedScore)
            };
          })
        );
        
        matches.push(...batchMatches);
      }
      
      // Sort by match score and return
      return matches.sort((a, b) => b.matchScore - a.matchScore);
      
    } catch (error) {
      console.error('Batch job-to-users matching failed:', error);
      return [];
    }
  }

  /**
   * Enhanced skill alignment calculation
   */
  private calculateSkillAlignment(userProfile: UserSemanticProfile, job: any): number {
    const userSkills = userProfile.skills.map(s => s.toLowerCase());
    const jobText = `${job.title} ${job.description}`.toLowerCase();
    
    let alignmentScore = 0;
    let totalSkills = userSkills.length || 1;
    
    userSkills.forEach(skill => {
      if (jobText.includes(skill.toLowerCase())) {
        alignmentScore += 1;
      }
    });
    
    // Bonus for graduate-friendly language
    if (jobText.includes('graduate') || jobText.includes('entry-level') || 
        jobText.includes('no experience') || jobText.includes('recent graduate')) {
      alignmentScore += 0.5;
    }
    
    return Math.min(alignmentScore / totalSkills, 1);
  }

  /**
   * Enhanced career progression calculation
   */
  private calculateCareerProgression(userProfile: UserSemanticProfile, job: any): number {
    const userLevel = userProfile.experience_level;
    const jobLevel = this.inferRoleLevel(job.title, job.description);
    
    const levelHierarchy = { 'entry': 1, 'mid': 2, 'senior': 3 };
    const userLevelNum = levelHierarchy[userLevel as keyof typeof levelHierarchy] || 1;
    const jobLevelNum = levelHierarchy[jobLevel as keyof typeof levelHierarchy] || 1;
    
    // Prefer jobs that are at or 1 level above user's current level
    const levelDiff = jobLevelNum - userLevelNum;
    
    if (levelDiff <= 0) return 1; // Perfect for current level
    if (levelDiff === 1) return 0.8; // Good for growth
    if (levelDiff === 2) return 0.4; // Challenging but possible
    return 0; // Too advanced
  }

  /**
   * Enhanced cultural fit calculation
   */
  private calculateCulturalFit(userProfile: UserSemanticProfile, job: any): number {
    let fitScore = 0;
    
    // Industry preference alignment
    if (userProfile.preferred_industries.length > 0) {
      const jobIndustry = this.inferIndustry(job);
      if (userProfile.preferred_industries.some(industry => 
        jobIndustry.toLowerCase().includes(industry.toLowerCase()))) {
        fitScore += 0.3;
      }
    }
    
    // Work style alignment
    if (userProfile.work_style && job.description) {
      const jobDesc = job.description.toLowerCase();
      if (userProfile.work_style === 'remote' && jobDesc.includes('remote')) fitScore += 0.2;
      if (userProfile.work_style === 'office' && !jobDesc.includes('remote')) fitScore += 0.2;
      if (userProfile.work_style === 'hybrid' && jobDesc.includes('hybrid')) fitScore += 0.2;
    }
    
    // Location preference alignment
    if (userProfile.location_preferences.length > 0 && job.location) {
      const jobLocation = job.location.toLowerCase();
      if (userProfile.location_preferences.some(location => 
        jobLocation.includes(location.toLowerCase()))) {
        fitScore += 0.3;
      }
    }
    
    return Math.min(fitScore, 1);
  }

  /**
   * Generate enhanced semantic explanation
   */
  private generateSemanticExplanation(userProfile: UserSemanticProfile, job: any, score: number): string {
    const skillAlignment = this.calculateSkillAlignment(userProfile, job);
    const careerProgression = this.calculateCareerProgression(userProfile, job);
    const culturalFit = this.calculateCulturalFit(userProfile, job);
    
    let explanation = `Semantic match score: ${(score * 100).toFixed(1)}%`;
    
    if (skillAlignment > 0.7) {
      explanation += ` - Strong skill alignment`;
    }
    if (careerProgression > 0.7) {
      explanation += ` - Perfect career progression`;
    }
    if (culturalFit > 0.7) {
      explanation += ` - Great cultural fit`;
    }
    
    return explanation;
  }

  /**
   * Learn from user feedback to improve future matching
   */
  async learnFromFeedback(
    userEmail: string,
    jobHash: string,
    feedback: {
      action: 'positive' | 'negative' | 'neutral' | 'explain';
      score?: number;
      comment?: string;
    }
  ): Promise<void> {
    try {
      console.log(`🧠 Learning from feedback: ${userEmail} -> ${jobHash} (${feedback.action})`);
      
      // Store feedback for learning
      await this.storeFeedbackLearning(userEmail, jobHash, feedback);
      
      // Update user profile based on feedback
      await this.updateUserProfileFromFeedback(userEmail, jobHash, feedback);
      
      // Update job understanding based on feedback
      await this.updateJobUnderstandingFromFeedback(jobHash, feedback);
      
      console.log('✅ Feedback learning completed');
    } catch (error) {
      console.error('❌ Feedback learning failed:', error);
    }
  }

  /**
   * Store feedback data for machine learning
   */
  private async storeFeedbackLearning(
    userEmail: string,
    jobHash: string,
    feedback: any
  ): Promise<void> {
    try {
      // Store in feedback_learning_data table
      const { error } = await this.supabase
        .from('feedback_learning_data')
        .insert({
          user_email: userEmail,
          job_hash: jobHash,
          feedback_action: feedback.action,
          feedback_score: feedback.score || null,
          feedback_comment: feedback.comment || null,
          created_at: new Date().toISOString()
        });

      if (error) {
        console.warn('Failed to store feedback learning data:', error);
      }
    } catch (error) {
      console.warn('Feedback learning storage failed:', error);
    }
  }

  /**
   * Update user profile understanding based on feedback
   */
  private async updateUserProfileFromFeedback(
    userEmail: string,
    jobHash: string,
    feedback: any
  ): Promise<void> {
    try {
      // Get the job that received feedback
      const { data: job } = await this.supabase
        .from('jobs')
        .select('*')
        .eq('job_hash', jobHash)
        .single();

      if (!job) return;

      // Analyze what the feedback tells us about user preferences
      const feedbackInsights = this.analyzeFeedbackInsights(feedback, job);
      
      // Store insights for future profile updates
      await this.supabase
        .from('user_feedback_insights')
        .upsert({
          user_email: userEmail,
          insight_type: feedbackInsights.type,
          insight_data: feedbackInsights.data,
          updated_at: new Date().toISOString()
        }, {
          onConflict: 'user_email,insight_type'
        });

    } catch (error) {
      console.warn('User profile feedback update failed:', error);
    }
  }

  /**
   * Update job understanding based on feedback
   */
  private async updateJobUnderstandingFromFeedback(
    jobHash: string,
    feedback: any
  ): Promise<void> {
    try {
      // Store job feedback insights
      const feedbackInsights = this.analyzeJobFeedbackInsights(feedback);
      
      await this.supabase
        .from('job_feedback_insights')
        .upsert({
          job_hash: jobHash,
          feedback_action: feedback.action,
          feedback_score: feedback.score || null,
          insight_data: feedbackInsights,
          updated_at: new Date().toISOString()
        }, {
          onConflict: 'job_hash,feedback_action'
        });

    } catch (error) {
      console.warn('Job understanding feedback update failed:', error);
    }
  }

  /**
   * Analyze feedback to extract user preference insights
   */
  private analyzeFeedbackInsights(feedback: any, job: any): { type: string, data: any } {
    if (feedback.action === 'positive' && feedback.score && feedback.score >= 4) {
      // User liked this job - extract positive preferences
      return {
        type: 'positive_preferences',
        data: {
          preferred_industries: [this.inferIndustry(job)],
          preferred_company_sizes: [this.inferCompanySize(job.company)],
          preferred_role_levels: [this.inferRoleLevel(job.title, job.description)],
          preferred_locations: [job.location],
          preferred_skills: this.extractSkillsFallback(job)
        }
      };
    } else if (feedback.action === 'negative' && feedback.score && feedback.score <= 2) {
      // User disliked this job - extract negative preferences
      return {
        type: 'negative_preferences',
        data: {
          disliked_industries: [this.inferIndustry(job)],
          disliked_company_sizes: [this.inferCompanySize(job.company)],
          disliked_role_levels: [this.inferRoleLevel(job.title, job.description)],
          disliked_locations: [job.location],
          disliked_skills: this.extractSkillsFallback(job)
        }
      };
    }

    return {
      type: 'general_feedback',
      data: { feedback, job_context: { industry: this.inferIndustry(job), level: this.inferRoleLevel(job.title, job.description) } }
    };
  }

  /**
   * Analyze feedback to extract job insights
   */
  private analyzeJobFeedbackInsights(feedback: any): any {
    if (feedback.action === 'positive' && feedback.score && feedback.score >= 4) {
      return {
        positive_feedback_count: 1,
        avg_positive_score: feedback.score,
        graduate_friendly: true,
        entry_level_suitable: true
      };
    } else if (feedback.action === 'negative' && feedback.score && feedback.score <= 2) {
      return {
        negative_feedback_count: 1,
        avg_negative_score: feedback.score,
        graduate_friendly: false,
        entry_level_suitable: false
      };
    }

    return {
      neutral_feedback_count: 1,
      feedback_action: feedback.action
    };
  }

  /**
   * Get personalized recommendations based on feedback history
   */
  async getPersonalizedRecommendations(
    userEmail: string,
    jobs: any[],
    maxResults: number = 10
  ): Promise<SemanticMatch[]> {
    try {
      // Get user's feedback history
      const { data: feedbackHistory } = await this.supabase
        .from('feedback_learning_data')
        .select('*')
        .eq('user_email', userEmail)
        .order('created_at', { ascending: false })
        .limit(100);

      if (!feedbackHistory || feedbackHistory.length === 0) {
        // No feedback history, use standard matching
        return this.performSemanticMatching({}, jobs, maxResults);
      }

      // Analyze feedback patterns
      const userPreferences = this.analyzeFeedbackPatterns(feedbackHistory);
      
      // Apply feedback-based adjustments to matching
      const adjustedMatches = await this.performSemanticMatching(userPreferences, jobs, maxResults);
      
      // Boost scores for jobs that match positive feedback patterns
      const boostedMatches = adjustedMatches.map(match => {
        const job = jobs.find(j => j.job_hash === match.job_hash);
        if (!job) return match;

        const feedbackBoost = this.calculateFeedbackBoost(job, userPreferences);
        const boostedScore = Math.min(match.semantic_score + feedbackBoost, 1.0);

        return {
          ...match,
          semantic_score: boostedScore,
          explanation: `${match.explanation} + Feedback boost: ${(feedbackBoost * 100).toFixed(1)}%`
        };
      });

      return boostedMatches.sort((a, b) => b.semantic_score - a.semantic_score);

    } catch (error) {
      console.error('Personalized recommendations failed:', error);
      return this.performSemanticMatching({}, jobs, maxResults);
    }
  }

  /**
   * Analyze feedback patterns to understand user preferences
   */
  private analyzeFeedbackPatterns(feedbackHistory: any[]): any {
    const preferences: any = {
      positive_industries: new Set(),
      positive_company_sizes: new Set(),
      positive_locations: new Set(),
      negative_industries: new Set(),
      negative_company_sizes: new Set(),
      negative_locations: new Set()
    };

    feedbackHistory.forEach(feedback => {
      if (feedback.feedback_action === 'positive' && feedback.feedback_score >= 4) {
        // Positive feedback - extract preferences
        if (feedback.insight_data?.preferred_industries) {
          feedback.insight_data.preferred_industries.forEach((industry: string) => 
            preferences.positive_industries.add(industry)
          );
        }
        if (feedback.insight_data?.preferred_company_sizes) {
          feedback.insight_data.preferred_company_sizes.forEach((size: string) => 
            preferences.positive_company_sizes.add(size)
          );
        }
        if (feedback.insight_data?.preferred_locations) {
          feedback.insight_data.preferred_locations.forEach((location: string) => 
            preferences.positive_locations.add(location)
          );
        }
      } else if (feedback.feedback_action === 'negative' && feedback.feedback_score <= 2) {
        // Negative feedback - extract aversions
        if (feedback.insight_data?.disliked_industries) {
          feedback.insight_data.disliked_industries.forEach((industry: string) => 
            preferences.negative_industries.add(industry)
          );
        }
        if (feedback.insight_data?.disliked_company_sizes) {
          feedback.insight_data.disliked_company_sizes.forEach((size: string) => 
            preferences.negative_company_sizes.add(size)
          );
        }
        if (feedback.insight_data?.disliked_locations) {
          feedback.insight_data.disliked_locations.forEach((location: string) => 
            preferences.negative_locations.add(location)
          );
        }
      }
    });

    // Convert sets to arrays
    return {
      preferred_industries: Array.from(preferences.positive_industries),
      preferred_company_types: Array.from(preferences.positive_company_sizes),
      target_cities: Array.from(preferences.positive_locations),
      disliked_industries: Array.from(preferences.negative_industries),
      disliked_company_types: Array.from(preferences.negative_company_sizes),
      disliked_locations: Array.from(preferences.negative_locations)
    };
  }

  /**
   * Calculate feedback boost for a job based on user preferences
   */
  private calculateFeedbackBoost(job: any, userPreferences: any): number {
    let boost = 0;
    
    // Positive industry match
    if (userPreferences.preferred_industries?.includes(this.inferIndustry(job))) {
      boost += 0.1;
    }
    
    // Positive company size match
    if (userPreferences.preferred_company_types?.includes(this.inferCompanySize(job.company))) {
      boost += 0.05;
    }
    
    // Positive location match
    if (userPreferences.target_cities?.some((city: string) => 
      job.location.toLowerCase().includes(city.toLowerCase())
    )) {
      boost += 0.05;
    }
    
    // Negative industry match (reduce score)
    if (userPreferences.disliked_industries?.includes(this.inferIndustry(job))) {
      boost -= 0.15;
    }
    
    // Negative company size match
    if (userPreferences.disliked_company_types?.includes(this.inferCompanySize(job.company))) {
      boost -= 0.1;
    }
    
    // Negative location match
    if (userPreferences.disliked_locations?.some((location: string) => 
      job.location.toLowerCase().includes(location.toLowerCase())
    )) {
      boost -= 0.1;
    }
    
    return Math.max(-0.3, Math.min(0.2, boost)); // Clamp between -30% and +20%
  }

  /**
   * Semantic search across job database
   */
  async semanticJobSearch(
    query: string,
    filters: {
      location?: string;
      industry?: string;
      company_size?: string;
      role_level?: string;
      job_type?: string;
      experience_level?: string;
    } = {},
    maxResults: number = 20
  ): Promise<Array<{ job: any, relevance_score: number, explanation: string }>> {
    try {
      console.log(`🔍 Semantic job search: "${query}" with filters:`, filters);
      
      // Generate embedding for search query
      const queryEmbedding = await this.generateEmbedding(query);
      
      // Build database query with filters
      let dbQuery = this.supabase
        .from('jobs')
        .select('*')
        .limit(maxResults * 2); // Get more results for better semantic ranking
      
      // Apply filters
      if (filters.location) {
        dbQuery = dbQuery.ilike('location', `%${filters.location}%`);
      }
      if (filters.industry) {
        dbQuery = dbQuery.ilike('title', `%${filters.industry}%`);
      }
      if (filters.role_level) {
        dbQuery = dbQuery.ilike('title', `%${filters.role_level}%`);
      }
      
      const { data: jobs, error } = await dbQuery;
      
      if (error || !jobs) {
        console.error('Database query failed:', error);
        return [];
      }
      
      console.log(`📊 Found ${jobs.length} jobs, performing semantic ranking...`);
      
      // Perform semantic ranking
      const rankedJobs = await this.rankJobsBySemanticRelevance(
        query,
        queryEmbedding,
        jobs,
        filters
      );
      
      // Return top results with explanations
      return rankedJobs.slice(0, maxResults).map(job => ({
        job: job.job,
        relevance_score: job.relevance_score,
        explanation: job.explanation
      }));
      
    } catch (error) {
      console.error('Semantic job search failed:', error);
      return [];
    }
  }

  /**
   * Rank jobs by semantic relevance to search query
   */
  private async rankJobsBySemanticRelevance(
    query: string,
    queryEmbedding: number[],
    jobs: any[],
    filters: any
  ): Promise<Array<{ job: any, relevance_score: number, explanation: string }>> {
    const rankedJobs = [];
    
    for (const job of jobs) {
      // Generate job semantic profile
      const jobSemanticProfile = await this.generateJobSemanticProfile(job);
      const jobEmbedding = await this.generateEmbedding(jobSemanticProfile);
      
      // Calculate semantic similarity
      const semanticScore = this.cosineSimilarity(queryEmbedding, jobEmbedding);
      
      // Calculate filter match score
      const filterScore = this.calculateFilterMatchScore(job, filters);
      
      // Calculate text relevance score
      const textRelevanceScore = this.calculateTextRelevance(query, job);
      
      // Combined relevance score
      const relevanceScore = (
        semanticScore * 0.5 +
        filterScore * 0.3 +
        textRelevanceScore * 0.2
      );
      
      // Generate explanation
      const explanation = this.generateSearchExplanation(
        query,
        job,
        semanticScore,
        filterScore,
        textRelevanceScore
      );
      
      rankedJobs.push({
        job,
        relevance_score: relevanceScore,
        explanation
      });
    }
    
    // Sort by relevance score
    return rankedJobs.sort((a, b) => b.relevance_score - a.relevance_score);
  }

  /**
   * Calculate how well a job matches the search filters
   */
  private calculateFilterMatchScore(job: any, filters: any): number {
    let score = 0;
    let totalFilters = 0;
    
    if (filters.location) {
      totalFilters++;
      if (job.location.toLowerCase().includes(filters.location.toLowerCase())) {
        score += 1;
      }
    }
    
    if (filters.industry) {
      totalFilters++;
      const jobIndustry = this.inferIndustry(job);
      if (jobIndustry.toLowerCase().includes(filters.industry.toLowerCase())) {
        score += 1;
      }
    }
    
    if (filters.company_size) {
      totalFilters++;
      const jobCompanySize = this.inferCompanySize(job.company);
      if (jobCompanySize.toLowerCase().includes(filters.company_size.toLowerCase())) {
        score += 1;
      }
    }
    
    if (filters.role_level) {
      totalFilters++;
      const jobRoleLevel = this.inferRoleLevel(job.title, job.description);
      if (jobRoleLevel.toLowerCase().includes(filters.role_level.toLowerCase())) {
        score += 1;
      }
    }
    
    if (filters.job_type) {
      totalFilters++;
      const jobType = this.inferJobType(job.title, job.description);
      if (jobType.toLowerCase().includes(filters.job_type.toLowerCase())) {
        score += 1;
      }
    }
    
    if (filters.experience_level) {
      totalFilters++;
      const jobExperience = this.inferRequiredExperience(job.title, job.description);
      if (jobExperience.toLowerCase().includes(filters.experience_level.toLowerCase())) {
        score += 1;
      }
    }
    
    return totalFilters > 0 ? score / totalFilters : 1;
  }

  /**
   * Calculate text relevance between query and job
   */
  private calculateTextRelevance(query: string, job: any): number {
    const queryWords = query.toLowerCase().split(/\s+/);
    const jobText = `${job.title} ${job.description}`.toLowerCase();
    
    let relevantWords = 0;
    queryWords.forEach(word => {
      if (word.length > 2 && jobText.includes(word)) {
        relevantWords++;
      }
    });
    
    return relevantWords / queryWords.length;
  }

  /**
   * Generate explanation for search result
   */
  private generateSearchExplanation(
    query: string,
    job: any,
    semanticScore: number,
    filterScore: number,
    textRelevanceScore: number
  ): string {
    const explanations = [];
    
    if (semanticScore > 0.7) {
      explanations.push('High semantic similarity');
    } else if (semanticScore > 0.5) {
      explanations.push('Good semantic match');
    }
    
    if (filterScore > 0.8) {
      explanations.push('Perfect filter match');
    } else if (filterScore > 0.6) {
      explanations.push('Good filter alignment');
    }
    
    if (textRelevanceScore > 0.7) {
      explanations.push('Strong text relevance');
    }
    
    if (explanations.length === 0) {
      explanations.push('Moderate overall relevance');
    }
    
    return explanations.join(', ');
  }

  /**
   * Advanced semantic search with multiple queries
   */
  async multiQuerySemanticSearch(
    queries: string[],
    filters: any = {},
    maxResults: number = 20
  ): Promise<Array<{ job: any, relevance_score: number, explanation: string }>> {
    try {
      console.log(`🔍 Multi-query semantic search: ${queries.length} queries`);
      
      // Generate embeddings for all queries
      const queryEmbeddings = await Promise.all(
        queries.map(query => this.generateEmbedding(query))
      );
      
      // Get jobs from database
      const { data: jobs, error } = await this.supabase
        .from('jobs')
        .select('*')
        .limit(maxResults * 3);
      
      if (error || !jobs) {
        console.error('Database query failed:', error);
        return [];
      }
      
      // Rank jobs by multi-query relevance
      const rankedJobs = await this.rankJobsByMultiQueryRelevance(
        queries,
        queryEmbeddings,
        jobs,
        filters
      );
      
      return rankedJobs.slice(0, maxResults);
      
    } catch (error) {
      console.error('Multi-query semantic search failed:', error);
      return [];
    }
  }

  /**
   * Rank jobs by relevance to multiple queries
   */
  private async rankJobsByMultiQueryRelevance(
    queries: string[],
    queryEmbeddings: number[][],
    jobs: any[],
    filters: any
  ): Promise<Array<{ job: any, relevance_score: number, explanation: string }>> {
    const rankedJobs = [];
    
    for (const job of jobs) {
      const jobSemanticProfile = await this.generateJobSemanticProfile(job);
      const jobEmbedding = await this.generateEmbedding(jobSemanticProfile);
      
      // Calculate relevance to each query
      const queryScores = queryEmbeddings.map(embedding => 
        this.cosineSimilarity(embedding, jobEmbedding)
      );
      
      // Use the best query score
      const bestQueryScore = Math.max(...queryScores);
      
      // Calculate filter match score
      const filterScore = this.calculateFilterMatchScore(job, filters);
      
      // Combined relevance score
      const relevanceScore = (
        bestQueryScore * 0.6 +
        filterScore * 0.4
      );
      
      // Generate explanation
      const explanation = `Best query match: ${(bestQueryScore * 100).toFixed(1)}%, Filter match: ${(filterScore * 100).toFixed(1)}%`;
      
      rankedJobs.push({
        job,
        relevance_score: relevanceScore,
        explanation
      });
    }
    
    return rankedJobs.sort((a, b) => b.relevance_score - a.relevance_score);
  }

  /**
   * Get semantic job recommendations for a user
   */
  async getSemanticJobRecommendations(
    userEmail: string,
    maxResults: number = 10
  ): Promise<Array<{ job: any, recommendation_score: number, reason: string }>> {
    try {
      // Get user preferences
      const { data: userPrefs } = await this.supabase
        .from('users')
        .select('*')
        .eq('email', userEmail)
        .single();
      
      if (!userPrefs) {
        console.warn('User not found for recommendations');
        return [];
      }
      
      // Get recent jobs
      const { data: jobs } = await this.supabase
        .from('jobs')
        .select('*')
        .order('created_at', { ascending: false })
        .limit(100);
      
      if (!jobs) return [];
      
      // Get personalized recommendations
      const semanticMatches = await this.getPersonalizedRecommendations(userEmail, jobs, maxResults);
      
      // Convert to recommendation format
      return semanticMatches.map(match => ({
        job: jobs.find((j: any) => j.job_hash === match.job_hash),
        recommendation_score: match.semantic_score,
        reason: match.explanation
      })).filter(r => r.job);
      
    } catch (error) {
      console.error('Semantic job recommendations failed:', error);
      return [];
    }
  }
}
