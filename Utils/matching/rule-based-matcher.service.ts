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
  locTag 
} from './normalizers';

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
    const jobLocation = job.location?.toLowerCase() || '';
    const userCities = userPrefs.target_cities.map(city => city.toLowerCase());
    
    const locationMatch = userCities.some(city => 
      jobLocation.includes(city) || 
      jobLocation.includes('remote') ||
      jobLocation.includes('hybrid')
    );

    if (!locationMatch) {
      return { passed: false, reason: 'Location mismatch' };
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

export function calculateMatchScore(job: Job, userPrefs: UserPreferences): MatchScore {
  const categories = normalizeToString(job.categories);
  const tags = cats(categories);

  // Eligibility score (0-100)
  const eligibilityScore = hasEligibility(categories) ? 100 : 0;

  // Location score (0-100)
  const locationScore = calculateLocationScore(job, userPrefs);

  // Experience level score (0-100)
  const experienceScore = calculateExperienceScore(job, userPrefs);

  // Skills/company type score (0-100)
  const skillsScore = calculateSkillsScore(job, userPrefs);

  // Company type score (0-100)
  const companyScore = calculateCompanyScore(job, userPrefs);

  // Timing score (0-100)
  const timingScore = calculateTimingScore(job);

  // Calculate overall score (weighted average)
  const overallScore = Math.round(
    (eligibilityScore * 0.3) +
    (locationScore * 0.2) +
    (experienceScore * 0.2) +
    (skillsScore * 0.15) +
    (companyScore * 0.1) +
    (timingScore * 0.05)
  );

  return {
    overall: overallScore,
    eligibility: eligibilityScore,
    location: locationScore,
    experience: experienceScore,
    skills: skillsScore,
    company: companyScore,
    timing: timingScore
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

  // Eligibility
  if (scoreBreakdown.eligibility > 80) {
    reasons.push('Perfect for early career');
    matchTags.push('early-career');
  }

  // Location
  if (scoreBreakdown.location > 80) {
    reasons.push('Great location match');
    matchTags.push('location-match');
  }

  // Experience level
  if (scoreBreakdown.experience > 80) {
    reasons.push('Right experience level');
    matchTags.push('experience-match');
  }

  // Skills/company type
  if (scoreBreakdown.skills > 80) {
    reasons.push('Strong skill alignment');
    matchTags.push('skill-match');
  }

  // Company type
  if (scoreBreakdown.company > 80) {
    reasons.push('Preferred company type');
    matchTags.push('company-match');
  }

  // Timing
  if (scoreBreakdown.timing > 80) {
    reasons.push('Fresh opportunity');
    matchTags.push('fresh');
  }

  // Career path match
  const userCareerPaths = userPrefs.career_path || [];
  const jobCareerSlugs = careerSlugs(categories);
  
  if (userCareerPaths.length > 0 && jobCareerSlugs.length > 0) {
    const hasCareerMatch = userCareerPaths.some(userPath => 
      jobCareerSlugs.some(jobSlug => 
        jobSlug.includes(userPath.toLowerCase())
      )
    );
    
    if (hasCareerMatch) {
      reasons.push('Career path alignment');
      matchTags.push('career-match');
    }
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

export function performRobustMatching(jobs: Job[], userPrefs: UserPreferences): MatchResult[] {
  const matches: MatchResult[] = [];
  
  for (const job of jobs) {
    // Apply hard gates
    const gateResult = applyHardGates(job, userPrefs);
    if (!gateResult.passed) {
      continue;
    }

    // Calculate match score
    const scoreBreakdown = calculateMatchScore(job, userPrefs);
    
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
      match_algorithm: 'rules',
      fallback_reason: 'Rule-based matching'
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
  console.log('🔄 Using rule-based fallback matching');
  console.log(`🧠 Using legacy robust fallback for ${userPrefs.email}`);
  
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
  const userExperience = userPrefs.entry_level_preference || 'entry';
  const jobDescription = job.description?.toLowerCase() || '';
  const jobTitle = job.title?.toLowerCase() || '';
  
  const combinedText = `${jobDescription} ${jobTitle}`;
  
  // Check for experience level indicators
  if (combinedText.includes('senior') || combinedText.includes('lead')) {
    return userExperience === 'senior' ? 100 : 20;
  }
  
  if (combinedText.includes('mid-level') || combinedText.includes('intermediate')) {
    return userExperience === 'mid' ? 100 : 40;
  }
  
  if (combinedText.includes('junior') || combinedText.includes('associate')) {
    return userExperience === 'entry' ? 100 : 60;
  }
  
  // Default to entry level
  return userExperience === 'entry' ? 80 : 50;
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

function getMatchQuality(score: number): string {
  if (score >= 90) return 'excellent';
  if (score >= 80) return 'very good';
  if (score >= 70) return 'good';
  if (score >= 60) return 'fair';
  return 'poor';
}
