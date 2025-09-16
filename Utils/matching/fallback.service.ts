/**
 * Rule-based fallback matching service
 * Extracted from the massive jobMatching.ts file
 */

import type { Job, UserPreferences, MatchResult, MatchScore } from './types';
import { normalizeJobForMatching } from './normalizers';

// ---------- Hard gates for job filtering ----------
export function applyHardGates(job: Job, userPrefs: UserPreferences): { passed: boolean; reason: string } {
  const normalizedJob = normalizeJobForMatching(job);
  
  // Gate 1: Remote job filtering (per user preference)
  if (normalizedJob.work_environment === 'remote') {
    return { passed: false, reason: 'Remote jobs excluded per user preference' };
  }
  
  // Gate 2: Location filtering
  const userCities = userPrefs.target_cities || [];
  if (userCities.length > 0) {
    const jobLocation = normalizedJob.location.toLowerCase();
    const hasLocationMatch = userCities.some(city => 
      jobLocation.includes(city.toLowerCase())
    );
    
    if (!hasLocationMatch) {
      // Check for EU location as fallback
      const euHints = [
        'uk', 'united kingdom', 'ireland', 'germany', 'france', 'spain', 'portugal', 'italy',
        'netherlands', 'belgium', 'luxembourg', 'denmark', 'sweden', 'norway', 'finland',
        'amsterdam', 'rotterdam', 'london', 'dublin', 'paris', 'berlin', 'munich',
        'madrid', 'barcelona', 'lisbon', 'milan', 'rome', 'stockholm', 'copenhagen'
      ];
      
      const hasEULocation = euHints.some(hint => jobLocation.includes(hint));
      if (!hasEULocation) {
        return { passed: false, reason: 'Location mismatch' };
      }
    }
  }
  
  // Gate 3: Experience level filtering
  const userLevel = userPrefs.entry_level_preference || 'entry';
  const jobText = `${normalizedJob.title} ${normalizedJob.description}`.toLowerCase();
  
  if (userLevel === 'entry' || userLevel === 'internship') {
    const seniorTerms = ['senior', 'staff', 'principal', 'lead', 'manager', 'director', 'head', 'vp', 'chief', 'executive'];
    const hasSeniorTerms = seniorTerms.some(term => jobText.includes(term));
    
    if (hasSeniorTerms) {
      return { passed: false, reason: 'Senior role for entry-level user' };
    }
  }
  
  return { passed: true, reason: 'Passed all gates' };
}

// ---------- Match score calculation ----------
export function calculateMatchScore(job: Job, userPrefs: UserPreferences): MatchScore {
  const normalizedJob = normalizeJobForMatching(job);
  const jobText = `${normalizedJob.title} ${normalizedJob.description}`.toLowerCase();
  const userCities = userPrefs.target_cities || [];
  const userCareer = userPrefs.professional_expertise || '';
  const userCareerPaths = userPrefs.career_path || [];
  
  let totalScore = 0;
  const breakdown = {
    location: 0,
    career: 0,
    experience: 0,
    company: 0,
    freshness: 0,
    eligibility: 0
  };
  
  // Location scoring (25% weight)
  const jobLocation = normalizedJob.location.toLowerCase();
  if (userCities.length > 0) {
    const hasExactMatch = userCities.some(city => 
      jobLocation.includes(city.toLowerCase())
    );
    if (hasExactMatch) {
      breakdown.location = 25;
    } else {
      // EU location fallback
      const euHints = ['uk', 'germany', 'france', 'spain', 'netherlands', 'london', 'berlin', 'paris', 'madrid', 'amsterdam'];
      const hasEULocation = euHints.some(hint => jobLocation.includes(hint));
      if (hasEULocation) {
        breakdown.location = 15;
      }
    }
  } else {
    breakdown.location = 10; // Default EU location score
  }
  
  // Career scoring (30% weight)
  if (userCareer && jobText.includes(userCareer.toLowerCase())) {
    breakdown.career = 30;
  } else {
    // Check career paths
    for (const path of userCareerPaths) {
      if (jobText.includes(path.toLowerCase())) {
        breakdown.career = 25;
        break;
      }
    }
    
    // Enhanced career mappings
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
          breakdown.career = Math.min(25, 10 + (matchCount * 3));
          break;
        }
      }
    }
  }
  
  // Experience scoring (20% weight)
  const earlyCareerTerms = ['graduate', 'intern', 'entry level', 'junior', 'trainee', 'associate', 'analyst'];
  const hasEarlyCareerTerms = earlyCareerTerms.some(term => jobText.includes(term));
  
  if (hasEarlyCareerTerms) {
    breakdown.experience = 20;
  } else {
    const mediumTerms = ['assistant', 'coordinator', 'specialist'];
    const hasMediumTerms = mediumTerms.some(term => jobText.includes(term));
    if (hasMediumTerms) {
      breakdown.experience = 15;
    }
  }
  
  // Company scoring (15% weight)
  const company = normalizedJob.company.toLowerCase();
  const tier1Companies = [
    'google', 'microsoft', 'apple', 'amazon', 'meta', 'netflix', 'spotify', 'uber', 'airbnb',
    'mckinsey', 'bain', 'bcg', 'deloitte', 'pwc', 'ey', 'kpmg',
    'goldman sachs', 'jpmorgan', 'morgan stanley', 'blackrock'
  ];
  
  const tier2Companies = [
    'klarna', 'spotify', 'zalando', 'delivery hero', 'hellofresh', 'n26', 'revolut',
    'sap', 'siemens', 'bosch', 'adidas', 'bmw', 'mercedes', 'volkswagen'
  ];
  
  if (tier1Companies.some(tier1 => company.includes(tier1))) {
    breakdown.company = 15;
  } else if (tier2Companies.some(tier2 => company.includes(tier2))) {
    breakdown.company = 12;
  } else if (company.length > 3 && !company.includes('ltd') && !company.includes('inc')) {
    breakdown.company = 8;
  }
  
  // Freshness scoring (10% weight)
  const postedDate = normalizedJob.posted_at || normalizedJob.created_at;
  if (postedDate) {
    const daysOld = (Date.now() - new Date(postedDate).getTime()) / (1000 * 60 * 60 * 24);
    if (daysOld < 1) breakdown.freshness = 10;
    else if (daysOld < 3) breakdown.freshness = 8;
    else if (daysOld < 7) breakdown.freshness = 6;
    else if (daysOld < 14) breakdown.freshness = 4;
    else if (daysOld < 28) breakdown.freshness = 2;
  }
  
  totalScore = Object.values(breakdown).reduce((sum, score) => sum + score, 0);
  
  return {
    total: Math.min(100, Math.max(0, totalScore)),
    breakdown,
    confidence: totalScore > 70 ? 0.9 : totalScore > 50 ? 0.7 : 0.5
  };
}

// ---------- Confidence scoring ----------
export function calculateConfidenceScore(job: Job, userPrefs: UserPreferences): number {
  const score = calculateMatchScore(job, userPrefs);
  return score.confidence;
}

// ---------- Match explanation generation ----------
export function generateMatchExplanation(job: Job, scoreBreakdown: MatchScore, userPrefs: UserPreferences): { reason: string; tags: string } {
  const reasons: string[] = [];
  const tags: string[] = [];
  
  if (scoreBreakdown.breakdown.location > 15) {
    reasons.push('Location match');
    tags.push('location');
  }
  
  if (scoreBreakdown.breakdown.career > 20) {
    reasons.push('Career alignment');
    tags.push('career');
  }
  
  if (scoreBreakdown.breakdown.experience > 15) {
    reasons.push('Experience level match');
    tags.push('experience');
  }
  
  if (scoreBreakdown.breakdown.company > 10) {
    reasons.push('Quality company');
    tags.push('company');
  }
  
  if (scoreBreakdown.breakdown.freshness > 5) {
    reasons.push('Recent posting');
    tags.push('freshness');
  }
  
  return {
    reason: reasons.join(', ') || 'Rule-based match',
    tags: tags.join(',') || 'fallback'
  };
}

// ---------- Match categorization ----------
export function categorizeMatches(matches: MatchResult[]): { confident: MatchResult[]; promising: MatchResult[] } {
  const confident = matches.filter(m => m.match_score >= 75);
  const promising = matches.filter(m => m.match_score >= 60 && m.match_score < 75);
  
  return { confident, promising };
}

// ---------- Main fallback matching function ----------
export function generateRobustFallbackMatches(jobs: Job[], userPrefs: UserPreferences): MatchResult[] {
  const matches: MatchResult[] = [];
  
  for (let i = 0; i < Math.min(jobs.length, 50); i++) {
    const job = jobs[i];
    
    // Apply hard gates
    const gateResult = applyHardGates(job, userPrefs);
    if (!gateResult.passed) {
      continue;
    }
    
    // Calculate match score
    const scoreResult = calculateMatchScore(job, userPrefs);
    
    // Only include matches above threshold
    if (scoreResult.total >= 60) {
      const explanation = generateMatchExplanation(job, scoreResult, userPrefs);
      
      matches.push({
        job,
        match_score: scoreResult.total,
        match_reason: explanation.reason,
        match_quality: getMatchQuality(scoreResult.total),
        match_tags: explanation.tags,
        confidence: scoreResult.confidence
      });
    }
  }
  
  // Sort by score and return top matches
  return matches
    .sort((a, b) => b.match_score - a.match_score)
    .slice(0, 10);
}

// ---------- Match quality helper ----------
export function getMatchQuality(score: number): string {
  if (score >= 85) return 'excellent';
  if (score >= 75) return 'good';
  if (score >= 65) return 'fair';
  return 'poor';
}