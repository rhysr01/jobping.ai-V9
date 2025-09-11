// 🔄 FEEDBACK SYSTEM INTEGRATION - BRIDGES EXISTING SYSTEM WITH NEW EMAIL STRUCTURE

// import { enhancedFeedbackSystem, type EmailFeedbackData } from '../enhancedFeedback';

/**
 * Enhanced feedback integration for email system
 * Provides seamless feedback collection and AI learning
 */
export class EmailFeedbackIntegration {
  
  /**
   * Generate feedback buttons for a specific job in emails
   * Uses the existing enhanced feedback system for consistency
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
    const { style = 'detailed', includeExplanation = true, includeScoring = true } = options;
    
    // Use the existing enhanced feedback system
    return enhancedFeedbackSystem.generateEmailFeedbackButtons(
      jobHash,
      userEmail,
      matchContext,
      {
        includeExplanation,
        includeScoring,
        buttonStyle: style
      }
    );
  }

  /**
   * Process feedback from email buttons
   * Routes to the existing enhanced feedback system
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
      
      // Create enhanced feedback data
      const enhancedData: EmailFeedbackData = {
        userEmail: feedbackData.userEmail,
        jobHash: feedbackData.jobHash,
        feedbackType: 'job_relevance',
        verdict,
        relevanceScore: feedbackData.score as any,
        explanation: feedbackData.explanation,
        jobContext: feedbackData.matchContext,
        timestamp: new Date()
      };

      // Record using existing system
      await enhancedFeedbackSystem.recordEmailFeedback(enhancedData);
      
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
   * Get feedback insights for email personalization
   */
  static async getFeedbackInsights(userEmail: string): Promise<any[]> {
    try {
      return await enhancedFeedbackSystem.getUserFeedbackInsights(userEmail);
    } catch (error) {
      console.error('Failed to get feedback insights:', error);
      return [];
    }
  }

  /**
   * Generate feedback summary for AI improvement
   */
  static async generateAIImprovementSummary(): Promise<string> {
    try {
      return await enhancedFeedbackSystem.generateAIImprovementSummary();
    } catch (error) {
      console.error('Failed to generate AI improvement summary:', error);
      return 'Error generating feedback summary';
    }
  }

  /**
   * Get feedback analytics for email optimization
   */
  static async getFeedbackAnalytics(period: 'day' | 'week' | 'month' = 'week'): Promise<any[]> {
    try {
      return await enhancedFeedbackSystem.getFeedbackAnalytics(period);
    } catch (error) {
      console.error('Failed to get feedback analytics:', error);
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
