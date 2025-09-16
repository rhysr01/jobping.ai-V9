// 🔄 SIMPLE FEEDBACK SYSTEM INTEGRATION - DIRECT DATABASE STORAGE

import { createClient } from '@supabase/supabase-js';

// Simple feedback data interface
interface SimpleFeedbackData {
  userEmail: string;
  jobHash: string;
  feedbackType: string;
  verdict: 'positive' | 'negative' | 'neutral';
  relevanceScore?: number;
  matchQualityScore?: number;
  explanation?: string;
  userPreferencesSnapshot?: any;
  jobContext?: any;
  matchContext?: any;
  timestamp: Date;
}

/**
 * Enhanced feedback integration for email system
 * Provides seamless feedback collection and AI learning
 */
export class EmailFeedbackIntegration {
  
  /**
   * Generate simple feedback buttons for a specific job in emails
   */
  static generateFeedbackButtons(
    jobHash: string,
    userEmail: string,
    matchContext: any = {},
    options: {
      style?: 'minimal' | 'detailed' | 'emoji';
      includeExplanation?: boolean;
      includeScoring?: boolean;
    } = {}
  ): string {
    const { style = 'detailed' } = options;
    
    // Generate simple feedback buttons
    const baseUrl = 'https://jobping.ai/api/feedback/email';
    const encodedEmail = encodeURIComponent(userEmail);
    
    if (style === 'minimal') {
      return `
        <div style="text-align: center; margin: 16px 0;">
          <a href="${baseUrl}?action=positive&job=${jobHash}&email=${encodedEmail}" style="background: #FFFFFF; color: #000000; padding: 8px 16px; border-radius: 6px; text-decoration: none; margin: 0 4px; font-size: 12px; font-weight: 500; transition: all 0.2s ease;">👍</a>
          <a href="${baseUrl}?action=neutral&job=${jobHash}&email=${encodedEmail}" style="background: #888888; color: #FFFFFF; padding: 8px 16px; border-radius: 6px; text-decoration: none; margin: 0 4px; font-size: 12px; font-weight: 500; transition: all 0.2s ease;">🤔</a>
          <a href="${baseUrl}?action=negative&job=${jobHash}&email=${encodedEmail}" style="background: #666666; color: #FFFFFF; padding: 8px 16px; border-radius: 6px; text-decoration: none; margin: 0 4px; font-size: 12px; font-weight: 500; transition: all 0.2s ease;">👎</a>
        </div>
      `;
    }
    
    // Default detailed style - minimalist
    return `
      <div style="margin-top: 16px; padding: 16px; background: #111111; border-radius: 8px; border: 1px solid #333333;">
        <div style="font-size: 14px; font-weight: 500; color: #FFFFFF; margin-bottom: 12px; text-align: center;">How was this match?</div>
        <div style="text-align: center; margin-bottom: 12px;">
          <a href="${baseUrl}?action=positive&score=5&job=${jobHash}&email=${encodedEmail}" style="background: #FFFFFF; color: #000000; padding: 6px 12px; border-radius: 6px; text-decoration: none; font-size: 12px; font-weight: 500; margin: 0 4px; transition: all 0.2s ease;">⭐ Perfect</a>
          <a href="${baseUrl}?action=positive&score=4&job=${jobHash}&email=${encodedEmail}" style="background: #FFFFFF; color: #000000; padding: 6px 12px; border-radius: 6px; text-decoration: none; font-size: 12px; font-weight: 500; margin: 0 4px; transition: all 0.2s ease;">👍 Good</a>
          <a href="${baseUrl}?action=neutral&score=3&job=${jobHash}&email=${encodedEmail}" style="background: #888888; color: #FFFFFF; padding: 6px 12px; border-radius: 6px; text-decoration: none; font-size: 12px; font-weight: 500; margin: 0 4px; transition: all 0.2s ease;">🤔 OK</a>
          <a href="${baseUrl}?action=negative&score=2&job=${jobHash}&email=${encodedEmail}" style="background: #666666; color: #FFFFFF; padding: 6px 12px; border-radius: 6px; text-decoration: none; font-size: 12px; font-weight: 500; margin: 0 4px; transition: all 0.2s ease;">👎 Poor</a>
          <a href="${baseUrl}?action=negative&score=1&job=${jobHash}&email=${encodedEmail}" style="background: #666666; color: #FFFFFF; padding: 6px 12px; border-radius: 6px; text-decoration: none; font-size: 12px; font-weight: 500; margin: 0 4px; transition: all 0.2s ease;">❌ Bad</a>
        </div>
        <div style="font-size: 11px; color: #888888; text-align: center; margin-top: 8px;">Your feedback helps improve job matching</div>
      </div>
    `;
  }

  /**
   * Process feedback from email buttons
   * Records directly to database
   */
  static async processEmailFeedback(feedbackData: {
    userEmail: string;
    jobHash: string;
    action: 'positive' | 'negative' | 'neutral';
    score?: number;
    explanation?: string;
    matchContext?: any;
  }): Promise<void> {
    try {
      // Convert action to verdict
      const verdict = this.convertActionToVerdict(feedbackData.action);
      
      // Create simple feedback data
      const simpleData: SimpleFeedbackData = {
        userEmail: feedbackData.userEmail,
        jobHash: feedbackData.jobHash,
        feedbackType: 'job_relevance',
        verdict,
        relevanceScore: feedbackData.score as any,
        explanation: feedbackData.explanation,
        jobContext: feedbackData.matchContext,
        matchContext: {
          feedback_source: 'email_integration',
          timestamp: new Date().toISOString()
        },
        timestamp: new Date()
      };

      // Record directly to database
      await this.recordFeedbackToDatabase(simpleData);
      
      console.log(`📝 Email feedback processed: ${verdict} for job ${feedbackData.jobHash}`);
      
    } catch (error) {
      console.error('Failed to process email feedback:', error);
      throw error;
    }
  }

  /**
   * Convert email action to feedback verdict
   */
  private static convertActionToVerdict(action: string): 'positive' | 'negative' | 'neutral' {
    switch (action) {
      case 'positive':
        return 'positive';
      case 'negative':
        return 'negative';
      case 'neutral':
      default:
        return 'neutral';
    }
  }

  /**
   * Record feedback directly to database
   */
  private static async recordFeedbackToDatabase(feedbackData: SimpleFeedbackData): Promise<void> {
    try {
      const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
      const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
      
      if (!supabaseUrl || !supabaseKey) {
        throw new Error('Missing Supabase configuration');
      }
      
      const supabase = createClient(supabaseUrl, supabaseKey, {
        auth: {
          autoRefreshToken: false,
          persistSession: false
        }
      });
      
      // Insert feedback into database
      const { error } = await supabase
        .from('feedback')
        .insert({
          user_email: feedbackData.userEmail,
          job_hash: feedbackData.jobHash,
          feedback_type: feedbackData.feedbackType,
          verdict: feedbackData.verdict,
          relevance_score: feedbackData.relevanceScore,
          match_quality_score: feedbackData.matchQualityScore,
          explanation: feedbackData.explanation,
          user_preferences_snapshot: feedbackData.userPreferencesSnapshot,
          job_context: feedbackData.jobContext,
          match_context: feedbackData.matchContext,
          created_at: feedbackData.timestamp.toISOString()
        });

      if (error) {
        console.error('Failed to record feedback:', error);
        // Don't throw - we want feedback to work even if DB fails
      } else {
        console.log(`✅ Feedback recorded: ${feedbackData.verdict} for job ${feedbackData.jobHash}`);
      }
    } catch (error) {
      console.error('Error recording feedback to database:', error);
      // Don't throw - we want feedback to work even if DB fails
    }
  }

  /**
   * Get feedback insights for email personalization
   */
  static async getFeedbackInsights(userEmail: string): Promise<any[]> {
    try {
      const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
      const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
      
      if (!supabaseUrl || !supabaseKey) {
        return [];
      }
      
      const supabase = createClient(supabaseUrl, supabaseKey, {
        auth: {
          autoRefreshToken: false,
          persistSession: false
        }
      });
      
      const { data, error } = await supabase
        .from('feedback')
        .select('*')
        .eq('user_email', userEmail)
        .order('created_at', { ascending: false })
        .limit(10);
      
      if (error) {
        console.error('Failed to get feedback insights:', error);
        return [];
      }
      
      return data || [];
    } catch (error) {
      console.error('Failed to get feedback insights:', error);
      return [];
    }
  }
}

/**
 * Helper functions for email feedback
 */
export const emailFeedbackHelpers = {
  /**
   * Generate a unique feedback token for tracking
   */
  generateFeedbackToken: (jobHash: string, userEmail: string): string => {
    const timestamp = Date.now();
    const random = Math.random().toString(36).substr(2, 9);
    return `${jobHash}_${userEmail}_${timestamp}_${random}`;
  },

  /**
   * Validate feedback data before processing
   */
  validateFeedbackData: (data: any): boolean => {
    return !!(data.userEmail && data.jobHash && data.action);
  },

  /**
   * Extract feedback context from job data
   */
  extractFeedbackContext: (job: any): any => {
    return {
      jobTitle: job.title || job.job_title,
      company: job.company || job.company_name,
      location: job.location || job.job_location,
      skills: job.skills || job.required_skills,
      experience: job.experience || job.experience_level,
      salary: job.salary || job.salary_range,
      timestamp: new Date().toISOString()
    };
  }
};
