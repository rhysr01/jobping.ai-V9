/**
 * Pre-filter jobs by user preferences with scoring and feedback learning
 * Extracted to utility for reuse in batch processing
 */

import { Job as ScrapersJob } from '@/scrapers/types';
import type { UserPreferences } from '@/Utils/matching/types';
import { getDatabaseClient } from '@/Utils/databasePool';
import { addBreadcrumb } from '@/lib/sentry-utils';
import { MATCH_RULES } from '@/Utils/sendConfiguration';
import { getDatabaseCategoriesForForm } from './categoryMapper';

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
        addBreadcrumb({
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
  
  // Filter jobs by location first (fastest filter) - STRICT MATCHING
  const targetCities = Array.isArray(user.target_cities) 
    ? user.target_cities 
    : user.target_cities 
      ? [user.target_cities] 
      : [];
  
  /**
   * Strict location matching function
   * Matches city names with word boundaries to avoid false positives
   * e.g., "London" matches "London, UK" but NOT "New London"
   */
  const matchesLocationStrict = (job: ScrapersJob & { freshnessTier: string }, targetCity: string): boolean => {
    const jobLocation = (job.location || '').toLowerCase();
    const jobLoc = jobLocation.toLowerCase().trim();
    const city = targetCity.toLowerCase().trim();
    
    // Check structured city field first (most accurate)
    if ((job as any).city) {
      const jobCity = String((job as any).city).toLowerCase().trim();
      if (jobCity === city || jobCity.includes(city) || city.includes(jobCity)) {
        return true;
      }
    }
    
    // Use word boundary matching for location string
    // Match patterns like: "London", "London, UK", "Greater London", but NOT "New London"
    // Escape special regex characters in city name
    const escapedCity = city.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    const patterns = [
      new RegExp(`\\b${escapedCity}\\b`, 'i'), // Exact word match
      new RegExp(`^${escapedCity}[,\\s]`, 'i'), // Starts with city name
      new RegExp(`[,\\s]${escapedCity}[,\\s]`, 'i'), // City in middle
      new RegExp(`[,\\s]${escapedCity}$`, 'i'), // City at end
    ];
    
    // Check if any pattern matches
    if (patterns.some(pattern => pattern.test(jobLoc))) {
      return true;
    }
    
    // Handle special cases (Greater London, etc.)
    const specialCases: Record<string, string[]> = {
      'london': ['greater london', 'central london', 'north london', 'south london', 'east london', 'west london'],
      'paris': ['greater paris', 'paris region'],
      'berlin': ['greater berlin'],
      'madrid': ['greater madrid'],
      'barcelona': ['greater barcelona'],
    };
    
    if (specialCases[city]) {
      return specialCases[city].some(variant => jobLoc.includes(variant));
    }
    
    // Allow remote/hybrid if user hasn't explicitly excluded it
    if (jobLoc.includes('remote') || jobLoc.includes('hybrid') || jobLoc.includes('work from home')) {
      return true; // Remote/hybrid is always acceptable
    }
    
    return false;
  };
  
  const filteredJobs = targetCities.length > 0
    ? jobs.filter(job => {
        // Use strict matching
        return targetCities.some(city => matchesLocationStrict(job, city));
      })
    : jobs;
  
  // Track source distribution
  const sourceCount: Record<string, number> = {};
  
  // Initialize source counts
  filteredJobs.forEach(job => {
    const source = (job as any).source || 'unknown';
    sourceCount[source] = (sourceCount[source] || 0) + 1;
  });
  
  // Now score the location-filtered jobs with COMPREHENSIVE scoring
  const scoredJobs = filteredJobs.map(job => {
    let score = 0;
    let hasRoleMatch = false;
    let hasCareerMatch = false;
    const jobTitle = job.title.toLowerCase();
    const jobDesc = (job.description || '').toLowerCase();
    const jobLocation = (job.location || '').toLowerCase();
    const jobWorkEnv = ((job as any).work_environment || '').toLowerCase();
    
    // ============================================
    // COMPREHENSIVE SCORING SYSTEM (Total: 100+ points possible)
    // PRIORITY ORDER: Career Path > Role > Other factors
    // IMPORTANT: Roles are ALWAYS within the career path (from signup form)
    // ============================================
    
    // 1. Location match (REQUIRED - already filtered, but give points)
    score += 40; // Base score for location match (reduced from 50 to make room for other factors)
    
    // 2. Career path scoring (HIGHEST PRIORITY - most important factor)
    // Career path is MORE IMPORTANT than role - it defines the user's direction
    // Roles are ALWAYS a subset of the career path (from signup form structure)
    if (user.career_path) {
      const careerPaths = Array.isArray(user.career_path) ? user.career_path : [user.career_path];
      hasCareerMatch = careerPaths.some(path => {
        if (!path) return false;
        const pathLower = path.toLowerCase();
        
        // Check job title/description for career path keywords
        const titleMatch = jobTitle.includes(pathLower) || jobDesc.includes(pathLower);
        
        // CRITICAL: Also check job categories against mapped database categories
        // Form value 'strategy' → DB category 'strategy-business-design'
        const dbCategories = getDatabaseCategoriesForForm(path);
        const categoryMatch = (job as any).categories && Array.isArray((job as any).categories) && 
          (job as any).categories.some((cat: string) => 
            dbCategories.some(dbCat => 
              cat.toLowerCase().includes(dbCat.toLowerCase()) || 
              dbCat.toLowerCase().includes(cat.toLowerCase())
            )
          );
        
        return titleMatch || categoryMatch;
      });
      if (hasCareerMatch) {
        score += 35; // HIGHEST priority - career path match
      } else {
        // QUALITY FOCUS: Moderate penalty - ensures quality matches rank higher
        // But don't exclude completely - allow close matches through
        score -= 15; // Moderate penalty - ensures quality ranking
      }
    }
    
    // 3. Role/Title matching (SECOND PRIORITY - refinement WITHIN career path)
    // IMPORTANT: Roles are ALWAYS within the career path from the signup form
    // So if career path matches, roles are more likely to match too
    // This is a refinement filter, not a separate concern
    if (user.roles_selected && user.roles_selected.length > 0) {
      const roles = user.roles_selected;
      hasRoleMatch = roles.some((role: string) => {
        if (!role) return false;
        const roleLower = role.toLowerCase();
        // Check for exact role match or partial match
        return jobTitle.includes(roleLower) || 
               jobDesc.includes(roleLower) ||
               // Also check for role keywords (e.g., "Analyst" matches "Financial Analyst")
               roleLower.split(' ').some(keyword => 
                 jobTitle.includes(keyword) || jobDesc.includes(keyword)
               );
      });
      if (hasRoleMatch) {
        // If career path already matches, role match is more valuable (refinement)
        // If career path doesn't match, role match is less valuable (might be wrong career)
        if (hasCareerMatch) {
          score += 20; // Role match WITHIN correct career path (refinement bonus)
        } else {
          score += 10; // Role match but wrong career path (less valuable)
        }
      } else {
        // QUALITY FOCUS: Penalties ensure quality matches rank higher
        // But still allow through if career path matches (shows flexibility)
        if (hasCareerMatch) {
          score -= 3; // Small penalty - career path matches but role doesn't (still quality match)
        } else {
          score -= 10; // Moderate penalty - ensures quality ranking
        }
      }
    }
    
    // 4. Work environment matching (if user specified)
    if (user.work_environment && user.work_environment !== 'unclear') {
      const userWorkEnv = user.work_environment.toLowerCase();
      const jobWorkEnvLower = jobWorkEnv || jobLocation; // Check location string too
      
      if (userWorkEnv === 'remote' && (jobWorkEnvLower.includes('remote') || jobWorkEnvLower.includes('work from home'))) {
        score += 10; // Remote preference match
      } else if (userWorkEnv === 'hybrid' && (jobWorkEnvLower.includes('hybrid') || jobWorkEnvLower.includes('remote'))) {
        score += 8; // Hybrid preference match (remote also acceptable)
      } else if (userWorkEnv === 'on-site' && !jobWorkEnvLower.includes('remote') && !jobWorkEnvLower.includes('hybrid')) {
        score += 5; // On-site preference match
      } else if (userWorkEnv !== 'unclear') {
        score -= 5; // Penalty for mismatch
      }
    }
    
    // 5. Entry level preference matching (improved with flags)
    if (user.entry_level_preference) {
      const entryLevel = user.entry_level_preference.toLowerCase();
      const jobIsInternship = (job as any).is_internship === true;
      const jobIsGraduate = (job as any).is_graduate === true;
      const jobIsEarlyCareer = (job as any).is_early_career === true || 
                               ((job as any).categories && Array.isArray((job as any).categories) && 
                                (job as any).categories.includes('early-career'));
      
      // Check for working student terms in job (werkstudent, part-time student, etc.)
      const workingStudentTerms = ['werkstudent', 'working student', 'part-time student', 'student worker', 'student job'];
      const isWorkingStudentJob = workingStudentTerms.some(term => 
        jobTitle.includes(term) || jobDesc.includes(term)
      );
      
      // Use flags first (most accurate)
      if (entryLevel.includes('intern') && jobIsInternship) {
        score += 15; // Perfect match for internship
      } else if (entryLevel.includes('intern') && !jobIsInternship) {
        score -= 5; // Penalty if user wants internship but job isn't
      }
      
      // Working Student preference: boost internships, especially those with working student terms
      if (entryLevel.includes('working student')) {
        if (jobIsInternship && isWorkingStudentJob) {
          score += 15; // Perfect match for working student role
        } else if (jobIsInternship) {
          score += 12; // Good match (internship, but not explicitly working student)
        } else if (isWorkingStudentJob) {
          score += 10; // Text match for working student terms
        }
      }
      
      if (entryLevel.includes('graduate') && jobIsGraduate) {
        score += 15; // Perfect match for graduate programme
      } else if (entryLevel.includes('graduate') && !jobIsGraduate && !jobIsInternship) {
        score -= 5; // Penalty if user wants graduate but job isn't
      }
      
      if (entryLevel.includes('entry level') && jobIsEarlyCareer && !jobIsInternship && !jobIsGraduate) {
        score += 10; // Match for entry-level roles
      }
      
      // Fallback to text matching
      const entryKeywords = ['intern', 'internship', 'graduate', 'grad', 'entry', 'junior', 'trainee', 'associate', 'assistant'];
      const seniorKeywords = ['senior', 'lead', 'principal', 'manager', 'director', 'head', 'executive'];
      
      const isEntryLevel = entryKeywords.some(kw => jobTitle.includes(kw) || jobDesc.includes(kw));
      const isSenior = seniorKeywords.some(kw => jobTitle.includes(kw) || jobDesc.includes(kw));
      
      if (entryLevel.includes('entry') && isEntryLevel && !jobIsInternship && !jobIsGraduate) {
        score += 8; // Entry level match (text-based)
      } else if (entryLevel.includes('entry') && isSenior) {
        score -= 15; // Strong penalty for senior jobs when user wants entry
      }
    }
    
    // 6. Company type matching (if user specified)
    if (user.company_types && user.company_types.length > 0) {
      const companyTypes = user.company_types;
      const companyName = ((job as any).company || '').toLowerCase();
      const hasCompanyMatch = companyTypes.some(type => {
        const typeLower = type.toLowerCase();
        // Check company name and description
        return companyName.includes(typeLower) || 
               jobDesc.includes(typeLower) ||
               // Handle common variations
               (typeLower.includes('startup') && (companyName.includes('startup') || jobDesc.includes('startup'))) ||
               (typeLower.includes('consulting') && (companyName.includes('consulting') || jobDesc.includes('consulting')));
      });
      if (hasCompanyMatch) {
        score += 5; // Company type match
      }
    }
    
    // 7. Language scoring (improved - uses extracted language_requirements)
    if (user.languages_spoken && Array.isArray(user.languages_spoken) && user.languages_spoken.length > 0) {
      const jobLanguages = (job as any).language_requirements;
      
      // Use extracted language_requirements field first (most accurate)
      if (jobLanguages && Array.isArray(jobLanguages) && jobLanguages.length > 0 && user.languages_spoken && Array.isArray(user.languages_spoken)) {
        const matchingLanguages = jobLanguages.filter((lang: string) => 
          user.languages_spoken!.some(userLang => 
            userLang.toLowerCase().includes(lang.toLowerCase()) || 
            lang.toLowerCase().includes(userLang.toLowerCase())
          )
        );
        if (matchingLanguages.length > 0) {
          score += 10; // Bonus for language match (increased from 7)
        } else {
          score -= 3; // Small penalty if job requires languages user doesn't speak
        }
      } else {
        // Fallback to text matching in description
        const languages = Array.isArray(user.languages_spoken) ? user.languages_spoken : [user.languages_spoken];
        const hasLanguageMatch = languages.some(lang => {
          if (!lang) return false;
          const langLower = lang.toLowerCase();
          return jobDesc.includes(langLower) || 
                 jobDesc.includes(`${langLower} speaking`) ||
                 jobDesc.includes(`fluent in ${langLower}`) ||
                 jobDesc.includes(`native ${langLower}`);
        });
        if (hasLanguageMatch) {
          score += 5; // Lower score for text-based match
        }
      }
    }
    
    // 8. Early career indicators (bonus points)
    const earlyCareerKeywords = ['graduate', 'intern', 'internship', 'entry', 'junior', 'trainee', 'associate'];
    const hasEarlyCareerIndicator = earlyCareerKeywords.some(kw => 
      jobTitle.includes(kw) || 
      jobDesc.includes(kw) ||
      (job as any).is_graduate ||
      (job as any).is_internship ||
      ((job as any).categories && Array.isArray((job as any).categories) && 
       (job as any).categories.includes('early-career'))
    );
    if (hasEarlyCareerIndicator) {
      score += 5; // Bonus for early career jobs
    }
    
    // 9. Apply feedback boosts (learned preferences)
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
    
    return { job, score, hasRoleMatch, hasCareerMatch };
  });
  
  // QUALITY-FOCUSED MATCHING: Ensure graduates get high-quality, relevant matches
  // CRITICAL: Career path matching is REQUIRED when user specifies it
  const userHasRolePreference = user.roles_selected && user.roles_selected.length > 0;
  const userHasCareerPreference = user.career_path && 
    (Array.isArray(user.career_path) ? user.career_path.length > 0 : !!user.career_path);
  
  // QUALITY THRESHOLD: Higher minimum ensures quality matches
  // Location match (40) + early career bonus (5) = 45 minimum for quality jobs
  // This ensures graduates get quality matches, not just any job
  const MINIMUM_SCORE = 45;
  
  // QUALITY FILTER: If user specified preferences, jobs must show SOME relevance
  // This ensures quality over quantity - graduates get relevant matches
  const QUALITY_RELEVANCE_THRESHOLD = 0.3; // At least 30% relevance to preferences
  
  // Sort by score, then ensure source diversity in top results
  const sortedJobs = scoredJobs
    .filter(item => {
      // Quality threshold - ensure matches are actually good
      if (item.score < MINIMUM_SCORE) return false;
      
      // CRITICAL: Career path matching is REQUIRED when user specifies it
      // This ensures graduates only see jobs in their chosen career path
      if (userHasCareerPreference && !item.hasCareerMatch) {
        return false; // Hard requirement - must match career path
      }
      
      // QUALITY CHECK: If user has role preferences, ensure job has some relevance
      // This prevents showing completely irrelevant jobs just to fill quota
      if (userHasRolePreference) {
        // Calculate relevance: how well does job match user's stated preferences?
        const baseScore = 40; // Location match
        const relevanceScore = item.score - baseScore; // Score beyond location
        const maxPossibleRelevance = 35 + 20 + 10 + 8 + 7 + 5; // Career + Role + WorkEnv + EntryLevel + Language + EarlyCareer
        const relevanceRatio = relevanceScore / maxPossibleRelevance;
        
        // If relevance is too low, exclude it (quality over quantity)
        if (relevanceRatio < QUALITY_RELEVANCE_THRESHOLD) {
          return false;
        }
      }
      
      return true;
    })
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
  addBreadcrumb({
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

