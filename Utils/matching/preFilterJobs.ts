/**
 * Pre-filter jobs by user preferences with scoring and feedback learning
 * Extracted to utility for reuse in batch processing
 */

import { Job as ScrapersJob } from '@/scrapers/types';
import type { UserPreferences } from '@/Utils/matching/types';
import { getDatabaseClient } from '@/Utils/databasePool';
import * as Sentry from '@sentry/nextjs';
import { MATCH_RULES } from '@/Utils/sendConfiguration';

/**
 * Enhanced pre-filter jobs by user preferences with scoring AND feedback learning
 */
export async function preFilterJobsByUserPreferencesEnhanced(
  jobs: (ScrapersJob & { freshnessTier: string })[], 
  user: UserPreferences
): Promise<(ScrapersJob & { freshnessTier: string })[]> {
  // Get user's feedback history for personalized boosting
  let feedbackBoosts: Map<string, number> = new Map();
  
  try {
    const supabase = getDatabaseClient();
    const { data: feedback } = await supabase
      .from('user_feedback')
      .select('relevance_score, job_context')
      .eq('user_email', user.email)
      .gte('relevance_score', 4)  // Only highly-rated jobs
      .limit(10);
    
    if (feedback && feedback.length > 0) {
      // Extract patterns from highly-rated jobs
      feedback.forEach(f => {
        const ctx = f.job_context;
        if (!ctx) return;
        
        // If user loved jobs in Berlin, boost Berlin jobs
        if (ctx.location) {
          const city = ctx.location.toLowerCase();
          feedbackBoosts.set(`loc:${city}`, (feedbackBoosts.get(`loc:${city}`) || 0) + 10);
        }
        
        // If user loved startup jobs, boost startups
        if (ctx.company?.toLowerCase().includes('startup')) {
          feedbackBoosts.set('type:startup', (feedbackBoosts.get('type:startup') || 0) + 10);
        }
        
        // If user loved remote jobs, boost remote
        if (ctx.location?.toLowerCase().includes('remote')) {
          feedbackBoosts.set('env:remote', (feedbackBoosts.get('env:remote') || 0) + 15);
        }
      });
      
      // Track feedback boosts for Sentry breadcrumb (no per-job logging)
      if (feedbackBoosts.size > 0) {
        Sentry.addBreadcrumb({
          message: 'Feedback boosts applied',
          level: 'debug',
          data: {
            userEmail: user.email,
            boostCount: feedbackBoosts.size,
            boostTypes: Object.fromEntries(feedbackBoosts)
          }
        });
      }
    }
  } catch (error) {
    console.warn('Failed to load feedback boosts:', error);
  }
  
  // Filter jobs by location first (fastest filter)
  const targetCities = Array.isArray(user.target_cities) 
    ? user.target_cities 
    : user.target_cities 
      ? [user.target_cities] 
      : [];
  
  const filteredJobs = targetCities.length > 0
    ? jobs.filter(job => {
        const jobLocation = (job.location || '').toLowerCase();
        return targetCities.some(city => jobLocation.includes(city.toLowerCase()));
      })
    : jobs;
  
  // Track source distribution
  const sourceCount: Record<string, number> = {};
  
  // Initialize source counts
  filteredJobs.forEach(job => {
    const source = (job as any).source || 'unknown';
    sourceCount[source] = (sourceCount[source] || 0) + 1;
  });
  
  // Now score the location-filtered jobs
  const scoredJobs = filteredJobs.map(job => {
    let score = 0;
    const jobTitle = job.title.toLowerCase();
    const jobDesc = (job.description || '').toLowerCase();
    const jobLocation = (job.location || '').toLowerCase();
    
    // Role/Title matching (HIGH priority - prevents finance guy getting sales jobs)
    if (user.roles_selected && user.roles_selected.length > 0) {
      const roles = user.roles_selected;
      const hasRoleMatch = roles.some((role: string) => 
        role && (jobTitle.includes(role.toLowerCase()) || jobDesc.includes(role.toLowerCase()))
      );
      if (hasRoleMatch) score += 30;
    }
    
    // Language scoring (if specified) - handle string or array
    if (user.languages_spoken) {
      const languages = Array.isArray(user.languages_spoken) ? user.languages_spoken : [user.languages_spoken];
      const hasLanguageMatch = languages.some(lang => 
        lang && jobDesc.includes(lang.toLowerCase())
      );
      if (hasLanguageMatch) score += 10;
    }
    
    // Career path scoring (handle string or array)
    if (user.career_path) {
      const careerPaths = Array.isArray(user.career_path) ? user.career_path : [user.career_path];
      const hasCareerMatch = careerPaths.some(path => 
        path && (jobTitle.includes(path.toLowerCase()) || jobDesc.includes(path.toLowerCase()))
      );
      if (hasCareerMatch) score += 20;
    }
    
    // NEW: Apply feedback boosts (learned preferences)
    feedbackBoosts.forEach((boost, key) => {
      const [type, value] = key.split(':');
      
      if (type === 'loc' && jobLocation.includes(value)) {
        score += boost;
      }
      if (type === 'type' && (jobTitle.includes(value) || jobDesc.includes(value))) {
        score += boost;
      }
      if (type === 'env' && jobLocation.includes(value)) {
        score += boost;
      }
    });
    
    return { job, score };
  });
  
  // Sort by score, then ensure source diversity in top results
  const sortedJobs = scoredJobs
    .filter(item => item.score > 0) // Only jobs with some match
    .sort((a, b) => b.score - a.score);
  
  // Ensure source diversity in top 100 jobs sent to AI
  const diverseJobs: typeof sortedJobs[0][] = [];
  const maxPerSource = MATCH_RULES.maxPerSource; // Max jobs from any single source in top results
  
  for (const item of sortedJobs) {
    const source = (item.job as any).source || 'unknown';
    const currentCount = diverseJobs.filter(d => ((d.job as any).source || 'unknown') === source).length;
    
    if (currentCount < maxPerSource) {
      diverseJobs.push(item);
    }
    
    if (diverseJobs.length >= 100) break; // Stop at 100 jobs
  }
  
  // Add remaining jobs if we don't have 100 yet
  if (diverseJobs.length < 100) {
    const remainingJobs = sortedJobs.filter(item => !diverseJobs.includes(item));
    diverseJobs.push(...remainingJobs.slice(0, 100 - diverseJobs.length));
  }
  
  const topJobs = diverseJobs.map(item => item.job);
  const sourceCounts = Object.entries(sourceCount).map(([s, c]) => `${s}:${c}`).join(', ');
  
  // Log job filtering results to Sentry breadcrumb instead of console
  Sentry.addBreadcrumb({
    message: 'Job filtering completed',
    level: 'info',
    data: {
      userEmail: user.email,
      originalCount: jobs.length,
      filteredCount: topJobs.length,
      sourceDistribution: sourceCounts,
      feedbackBoosted: feedbackBoosts.size > 0
    }
  });
  
  return topJobs;
}

