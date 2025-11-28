/**
 * Rule-Based Matching Service
 * Extracted from jobMatching.ts for better organization
 */

import { Job } from '../../scrapers/types';
import { UserPreferences, MatchResult, MatchScore, AiProvenance } from './types';
import {
  normalizeToString,
  cats,
  hasEligibility,
  careerSlugs,
  locTag,
  toWorkEnv
} from './normalizers';
import { validateLocationCompatibility } from './validators';
import { getScoringWeights } from '../config/matching';

// ================================
// RULE-BASED MATCHING
// ================================

export function applyHardGates(job: Job, userPrefs: UserPreferences): { passed: boolean; reason: string } {
  const categories = normalizeToString(job.categories);
  const tags = cats(categories);

  // Check if job is eligible for early career
  if (!hasEligibility(categories)) {
    return { passed: false, reason: 'Not eligible for early career' };
  }

  // Check location compatibility
  if (userPrefs.target_cities && userPrefs.target_cities.length > 0) {
    // Enhanced location matching using structured data
    const locationValidation = validateLocationCompatibility(
      [job.location || ''],
      userPrefs.target_cities,
      job.city || undefined,
      job.country || undefined
    );

    if (!locationValidation.compatible) {
      return { passed: false, reason: `Location mismatch: ${locationValidation.reasons[0]}` };
    }
  }

  // Check work environment preference
  if (userPrefs.work_environment && userPrefs.work_environment !== 'unclear') {
    const jobWorkEnv = job.work_environment?.toLowerCase();
    const userWorkEnv = userPrefs.work_environment.toLowerCase();
    
    if (jobWorkEnv && jobWorkEnv !== userWorkEnv && jobWorkEnv !== 'hybrid') {
      return { passed: false, reason: 'Work environment mismatch' };
    }
  }

  return { passed: true, reason: 'Passed all hard gates' };
}

export function calculateMatchScore(
  job: Job, 
  userPrefs: UserPreferences,
  semanticScore?: number
): MatchScore {
  const categories = normalizeToString(job.categories);
  const tags = cats(categories);

  // Career path score (0-100) - MOST IMPORTANT
  const careerPathScore = calculateCareerPathScore(job, userPrefs, categories);

  // Location score (0-100) - Hard requirement
  const locationScore = calculateLocationScore(job, userPrefs);

  // Work environment score (0-100) - Form options only: Office/Hybrid/Remote
  const workEnvironmentScore = calculateWorkEnvironmentScore(job, userPrefs);

  // Role fit score (0-100) - Specific role within career path
  const roleFitScore = calculateRoleFitScore(job, userPrefs);

  // Experience level score (0-100)
  const experienceLevelScore = calculateExperienceScore(job, userPrefs);

  // Company culture score (0-100) - Company type preference
  const companyCultureScore = calculateCompanyScore(job, userPrefs);

  // Skills score (0-100) - Technical/soft skills alignment
  const skillsScore = calculateSkillsScore(job, userPrefs);

  // Timing score (0-100) - Job freshness
  const timingScore = calculateTimingScore(job);

  // Get weights from config
  const weights = getScoringWeights();

  // Calculate overall score (weighted average)
  let overallScore = Math.round(
    (careerPathScore * weights.careerPath) +
    (locationScore * weights.location) +
    (workEnvironmentScore * weights.workEnvironment) +
    (roleFitScore * weights.roleFit) +
    (experienceLevelScore * weights.experienceLevel) +
    (companyCultureScore * weights.companyCulture) +
    (skillsScore * weights.skills) +
    (timingScore * weights.timing)
  );

  // Apply semantic boost if provided (hybrid approach)
  let semanticBoost = 0;
  if (semanticScore !== undefined && semanticScore > 0.65) {
    // Semantic boost: (similarity - 0.65) * 0.15 = max 5.25% boost at 1.0 similarity
    semanticBoost = Math.min(10, Math.round((semanticScore - 0.65) * 0.15 * 100)) / 100;
    overallScore = Math.min(100, Math.round(overallScore * (1 + semanticBoost)));
  }

  return {
    overall: overallScore,
    careerPath: careerPathScore,
    location: locationScore,
    workEnvironment: workEnvironmentScore,
    roleFit: roleFitScore,
    experienceLevel: experienceLevelScore,
    companyCulture: companyCultureScore,
    skills: skillsScore,
    timing: timingScore,
    semanticBoost: semanticBoost > 0 ? semanticBoost : undefined
  };
}

export function calculateConfidenceScore(job: Job, userPrefs: UserPreferences): number {
  const categories = normalizeToString(job.categories);
  const tags = cats(categories);

  let confidence = 0.5; // Base confidence

  // Increase confidence for clear eligibility
  if (hasEligibility(categories)) {
    confidence += 0.2;
  }

  // Increase confidence for location match
  if (userPrefs.target_cities && userPrefs.target_cities.length > 0) {
    const jobLocation = job.location?.toLowerCase() || '';
    const userCities = userPrefs.target_cities.map(city => city.toLowerCase());
    
    if (userCities.some(city => jobLocation.includes(city))) {
      confidence += 0.15;
    }
  }

  // Increase confidence for career path match
  const userCareerPaths = userPrefs.career_path || [];
  const jobCareerSlugs = careerSlugs(categories);
  
  if (userCareerPaths.length > 0 && jobCareerSlugs.length > 0) {
    const hasCareerMatch = userCareerPaths.some(userPath => 
      jobCareerSlugs.some(jobSlug => 
        jobSlug.includes(userPath.toLowerCase())
      )
    );
    
    if (hasCareerMatch) {
      confidence += 0.15;
    }
  }

  return Math.min(1.0, confidence);
}

export function generateMatchExplanation(
  job: Job, 
  scoreBreakdown: MatchScore, 
  userPrefs: UserPreferences
): { reason: string; tags: string } {
  const categories = normalizeToString(job.categories);
  const tags = cats(categories);
  
  const reasons: string[] = [];
  const matchTags: string[] = [];

  // Early career eligibility (always checked in hard gates, so just note it)
  if (hasEligibility(categories)) {
    reasons.push('Perfect for early career');
    matchTags.push('early-career');
  }

  // Career path
  if (scoreBreakdown.careerPath > 80) {
    reasons.push('Perfect career path match');
    matchTags.push('career-match');
  }

  // Location
  if (scoreBreakdown.location > 80) {
    reasons.push('Great location match');
    matchTags.push('location-match');
  }

  // Work environment
  if (scoreBreakdown.workEnvironment > 80) {
    reasons.push('Preferred work environment');
    matchTags.push('work-env-match');
  }

  // Role fit
  if (scoreBreakdown.roleFit > 80) {
    reasons.push('Ideal role match');
    matchTags.push('role-match');
  }

  // Experience level
  if (scoreBreakdown.experienceLevel > 80) {
    reasons.push('Right experience level');
    matchTags.push('experience-match');
  }

  // Company culture
  if (scoreBreakdown.companyCulture > 80) {
    reasons.push('Preferred company type');
    matchTags.push('company-match');
  }

  // Skills
  if (scoreBreakdown.skills > 80) {
    reasons.push('Strong skill alignment');
    matchTags.push('skill-match');
  }

  // Timing
  if (scoreBreakdown.timing > 80) {
    reasons.push('Fresh opportunity');
    matchTags.push('fresh');
  }

  // Semantic boost indicator
  if (scoreBreakdown.semanticBoost && scoreBreakdown.semanticBoost > 0) {
    reasons.push('Strong semantic match');
    matchTags.push('semantic-boost');
  }

  const reason = reasons.length > 0 
    ? reasons.join(', ') 
    : 'Good overall match';

  return {
    reason,
    tags: matchTags.join(', ')
  };
}

export function categorizeMatches(matches: MatchResult[]): { confident: MatchResult[]; promising: MatchResult[] } {
  const confident: MatchResult[] = [];
  const promising: MatchResult[] = [];

  matches.forEach(match => {
    if (match.confidence_score >= 0.7 && match.match_score >= 80) {
      confident.push(match);
    } else if (match.match_score >= 60) {
      promising.push(match);
    }
  });

  return { confident, promising };
}

export function performRobustMatching(
  jobs: Job[], 
  userPrefs: UserPreferences,
  semanticScores?: Map<string, number> // Optional: job_hash -> semantic_score
): MatchResult[] {
  const matches: MatchResult[] = [];
  
  for (const job of jobs) {
    // Apply hard gates
    const gateResult = applyHardGates(job, userPrefs);
    if (!gateResult.passed) {
      continue;
    }

    // Get semantic score if available (for hybrid approach)
    const semanticScore = semanticScores?.get(job.job_hash);

    // Calculate match score with optional semantic boost
    const scoreBreakdown = calculateMatchScore(job, userPrefs, semanticScore);
    
    // Skip low-scoring matches
    if (scoreBreakdown.overall < 50) {
      continue;
    }

    // Calculate confidence
    const confidenceScore = calculateConfidenceScore(job, userPrefs);
    
    // Generate explanation
    const explanation = generateMatchExplanation(job, scoreBreakdown, userPrefs);
    
    // Determine match quality
    const matchQuality = getMatchQuality(scoreBreakdown.overall);
    
    // Create provenance
    const provenance: AiProvenance = {
      match_algorithm: semanticScore ? 'hybrid' : 'rules',
      fallback_reason: semanticScore ? 'Hybrid matching (rule-based + semantic)' : 'Rule-based matching'
    };

    matches.push({
      job,
      match_score: scoreBreakdown.overall,
      match_reason: explanation.reason,
      confidence_score: confidenceScore,
      match_quality: matchQuality,
      score_breakdown: scoreBreakdown,
      provenance
    });
  }

  // Sort by match score (descending)
  matches.sort((a, b) => b.match_score - a.match_score);

  return matches;
}

export function generateRobustFallbackMatches(jobs: Job[], userPrefs: UserPreferences): MatchResult[] {
  console.log(' Using rule-based fallback matching');
  console.log(` Using legacy robust fallback for ${userPrefs.email}`);
  
  return performRobustMatching(jobs, userPrefs);
}

// ================================
// SCORING HELPERS
// ================================

function calculateLocationScore(job: Job, userPrefs: UserPreferences): number {
  if (!userPrefs.target_cities || userPrefs.target_cities.length === 0) {
    return 70; // Neutral score if no location preference
  }

  const jobLocation = job.location?.toLowerCase() || '';
  const userCities = userPrefs.target_cities.map(city => city.toLowerCase());
  
  // Exact city match
  if (userCities.some(city => jobLocation.includes(city))) {
    return 100;
  }
  
  // Remote/hybrid options
  if (jobLocation.includes('remote') || jobLocation.includes('hybrid')) {
    return 90;
  }
  
  // Country match
  const euCountries = ['germany', 'france', 'spain', 'netherlands', 'denmark', 'sweden'];
  if (euCountries.some(country => jobLocation.includes(country))) {
    return 60;
  }
  
  return 30; // Low score for other locations
}

function calculateExperienceScore(job: Job, userPrefs: UserPreferences): number {
  const userExperience = userPrefs.entry_level_preference?.toLowerCase() || 'entry';
  const jobDescription = job.description?.toLowerCase() || '';
  const jobTitle = job.title?.toLowerCase() || '';
  const combinedText = `${jobDescription} ${jobTitle}`;
  
  // Check for working student terms
  const workingStudentTerms = ['werkstudent', 'working student', 'part-time student', 'student worker', 'student job'];
  const isWorkingStudentJob = workingStudentTerms.some(term => 
    combinedText.includes(term)
  );
  
  // Use flags first (most accurate)
  if (job.is_internship) {
    if (userExperience.includes('intern')) {
      return 100; // Perfect match
    }
    // Working Student preference: boost internships, especially those with working student terms
    if (userExperience.includes('working student')) {
      return isWorkingStudentJob ? 100 : 85; // Perfect match if explicitly working student, otherwise good match
    }
    return 60; // Still early-career, but not user's preference
  }
  
  if (job.is_graduate) {
    if (userExperience.includes('graduate') || userExperience.includes('grad')) {
      return 100; // Perfect match
    }
    return 60; // Still early-career, but not user's preference
  }
  
  // Check for experience level indicators in text
  if (combinedText.includes('senior') || combinedText.includes('lead')) {
    return userExperience.includes('senior') ? 100 : 20;
  }
  
  if (combinedText.includes('mid-level') || combinedText.includes('intermediate')) {
    return userExperience.includes('mid') ? 100 : 40;
  }
  
  if (combinedText.includes('junior') || combinedText.includes('associate')) {
    return userExperience.includes('entry') ? 100 : 60;
  }
  
  // Working Student preference: check text for working student terms even if not flagged as internship
  if (userExperience.includes('working student') && isWorkingStudentJob) {
    return 90; // Good match for working student roles
  }
  
  // Default to entry level (all jobs are early-career)
  return userExperience.includes('entry') || !userExperience ? 80 : 50;
}

function calculateSkillsScore(job: Job, userPrefs: UserPreferences): number {
  const userRoles = userPrefs.roles_selected || [];
  const userCompanyTypes = userPrefs.company_types || [];
  
  if (userRoles.length === 0 && userCompanyTypes.length === 0) {
    return 70; // Neutral score
  }
  
  const jobDescription = job.description?.toLowerCase() || '';
  const jobTitle = job.title?.toLowerCase() || '';
  const combinedText = `${jobDescription} ${jobTitle}`;
  
  let score = 50; // Base score
  
  // Check role alignment
  userRoles.forEach(role => {
    if (combinedText.includes(role.toLowerCase())) {
      score += 15;
    }
  });
  
  // Check company type alignment
  userCompanyTypes.forEach(companyType => {
    if (combinedText.includes(companyType.toLowerCase())) {
      score += 10;
    }
  });
  
  return Math.min(100, score);
}

function calculateCompanyScore(job: Job, userPrefs: UserPreferences): number {
  const userCompanyTypes = userPrefs.company_types || [];
  
  if (userCompanyTypes.length === 0) {
    return 70; // Neutral score
  }
  
  const jobDescription = job.description?.toLowerCase() || '';
  const companyName = job.company?.toLowerCase() || '';
  const combinedText = `${jobDescription} ${companyName}`;
  
  let score = 50; // Base score
  
  userCompanyTypes.forEach(companyType => {
    if (combinedText.includes(companyType.toLowerCase())) {
      score += 20;
    }
  });
  
  return Math.min(100, score);
}

function calculateTimingScore(job: Job): number {
  if (!job.posted_at) {
    return 50; // Neutral score
  }
  
  const postedDate = new Date(job.posted_at);
  const now = new Date();
  const daysSincePosted = (now.getTime() - postedDate.getTime()) / (1000 * 60 * 60 * 24);
  
  if (daysSincePosted < 1) return 100; // Very fresh
  if (daysSincePosted < 3) return 90;  // Fresh
  if (daysSincePosted < 7) return 70;  // Recent
  if (daysSincePosted < 14) return 50; // Older
  
  return 30; // Stale
}

/**
 * Calculate career path score (0-100)
 * Career path is the MOST IMPORTANT factor (40% weight)
 */
function calculateCareerPathScore(job: Job, userPrefs: UserPreferences, categories: string): number {
  const userCareerPaths = userPrefs.career_path || [];
  
  if (userCareerPaths.length === 0) {
    return 70; // Neutral score if no preference
  }
  
  const jobCareerSlugs = careerSlugs(categories);
  const jobCategories = cats(categories);
  
  // Check for exact career path match
  const hasCareerMatch = userCareerPaths.some(userPath => {
    const userPathLower = userPath.toLowerCase();
    
    // Check job categories for career path match
    return jobCareerSlugs.some(jobSlug => 
      jobSlug.includes(userPathLower) || userPathLower.includes(jobSlug)
    ) || jobCategories.some(cat => 
      cat.toLowerCase().includes(userPathLower) || userPathLower.includes(cat.toLowerCase())
    );
  });
  
  if (hasCareerMatch) {
    return 100; // Perfect match
  }
  
  // Partial match (related career paths)
  const hasPartialMatch = userCareerPaths.some(userPath => {
    const userPathLower = userPath.toLowerCase();
    const jobText = `${job.title || ''} ${job.description || ''}`.toLowerCase();
    return jobText.includes(userPathLower);
  });
  
  return hasPartialMatch ? 60 : 30; // Partial match or no match
}

/**
 * Calculate work environment score (0-100)
 * Only considers form options: Office, Hybrid, Remote
 * Normalized to: on-site, hybrid, remote
 */
function calculateWorkEnvironmentScore(job: Job, userPrefs: UserPreferences): number {
  // Normalize user preference (form values: 'Office', 'Hybrid', 'Remote')
  const userWorkEnv = toWorkEnv(userPrefs.work_environment);
  const jobWorkEnv = toWorkEnv(job.work_environment);
  
  // If no preference specified, neutral score
  if (!userWorkEnv) {
    return 50;
  }
  
  // If job work environment is unclear, neutral score
  if (!jobWorkEnv) {
    return 50;
  }
  
  // Exact match
  if (userWorkEnv === jobWorkEnv) {
    return 100;
  }
  
  // Compatibility rules (form options only)
  if (userWorkEnv === 'remote') {
    // Remote users accept: remote (100), hybrid (60)
    if (jobWorkEnv === 'hybrid') return 60;
    if (jobWorkEnv === 'on-site') return 20;
  }
  
  if (userWorkEnv === 'hybrid') {
    // Hybrid users accept: hybrid (100), remote (90), on-site (40)
    if (jobWorkEnv === 'remote') return 90;
    if (jobWorkEnv === 'on-site') return 40;
  }
  
  if (userWorkEnv === 'on-site') {
    // Office users accept: on-site (100), hybrid (70), remote (20)
    if (jobWorkEnv === 'hybrid') return 70;
    if (jobWorkEnv === 'remote') return 20;
  }
  
  return 30; // Mismatch
}

/**
 * Calculate role fit score (0-100)
 * Specific role within career path (e.g., "Analyst" within "Finance")
 */
function calculateRoleFitScore(job: Job, userPrefs: UserPreferences): number {
  const userRoles = userPrefs.roles_selected || [];
  
  if (userRoles.length === 0) {
    return 70; // Neutral score if no role preference
  }
  
  const jobTitle = (job.title || '').toLowerCase();
  const jobDescription = (job.description || '').toLowerCase();
  const combinedText = `${jobTitle} ${jobDescription}`;
  
  // Check for exact role match
  const hasExactMatch = userRoles.some(role => {
    const roleLower = role.toLowerCase();
    return jobTitle.includes(roleLower) || 
           jobDescription.includes(roleLower);
  });
  
  if (hasExactMatch) {
    return 100; // Perfect match
  }
  
  // Check for partial match (role keywords)
  const hasPartialMatch = userRoles.some(role => {
    const roleKeywords = role.toLowerCase().split(' ');
    return roleKeywords.some(keyword => 
      keyword.length > 3 && combinedText.includes(keyword)
    );
  });
  
  return hasPartialMatch ? 60 : 40; // Partial match or no match
}

function getMatchQuality(score: number): string {
  if (score >= 90) return 'excellent';
  if (score >= 80) return 'very good';
  if (score >= 70) return 'good';
  if (score >= 60) return 'fair';
  return 'poor';
}
