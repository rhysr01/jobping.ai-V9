/**
 * Job Enrichment Service
 * Extracted from jobMatching.ts for better organization
 */

import { Job } from '../../scrapers/types';
import { EnrichedJob } from './types';

// ================================
// JOB ENRICHMENT
// ================================

export function enrichJobData(job: Job): EnrichedJob {
  const description = job.description?.toLowerCase() || '';
  const title = job.title?.toLowerCase() || '';
  
  return {
    ...job,
    visaFriendly: checkVisaFriendliness(description, title),
    experienceLevel: determineExperienceLevel(description, title),
    marketDemand: calculateMarketDemand(job),
    salaryRange: extractSalaryRange(description),
    companySize: determineCompanySize(job.company),
    remoteFlexibility: calculateRemoteFlexibility(description, job.work_environment),
    growthPotential: calculateGrowthPotential(description, job.company),
    culturalFit: calculateCulturalFit(description),
    skillAlignment: calculateSkillAlignment(description, title),
    locationScore: calculateLocationScore(job.location),
    timingScore: calculateTimingScore(job.posted_at),
    overallScore: 0 // Will be calculated by matching algorithm
  };
}

// ================================
// ENRICHMENT HELPERS
// ================================

function checkVisaFriendliness(description: string, title: string): boolean {
  const visaKeywords = [
    'visa sponsorship', 'sponsor visa', 'work permit', 'relocation support',
    'international candidates', 'global talent', 'diverse team'
  ];
  
  const text = `${description} ${title}`;
  return visaKeywords.some(keyword => text.includes(keyword));
}

function determineExperienceLevel(description: string, title: string): 'entry' | 'junior' | 'mid' | 'senior' {
  const text = `${description} ${title}`;
  
  if (text.includes('senior') || text.includes('lead') || text.includes('principal')) {
    return 'senior';
  }
  if (text.includes('mid-level') || text.includes('intermediate')) {
    return 'mid';
  }
  if (text.includes('junior') || text.includes('associate')) {
    return 'junior';
  }
  
  return 'entry';
}

function calculateMarketDemand(job: Job): number {
  // Base demand on job categories and company
  let demand = 5; // Base score
  
  if (job.categories?.includes('tech')) demand += 2;
  if (job.categories?.includes('ai') || job.categories?.includes('machine-learning')) demand += 3;
  if (job.categories?.includes('data')) demand += 2;
  if (job.categories?.includes('early-career')) demand += 1;
  
  return Math.min(10, demand);
}

function extractSalaryRange(description: string): string {
  const salaryPatterns = [
    /€(\d{1,3}(?:,\d{3})*(?:k)?)\s*-\s*€(\d{1,3}(?:,\d{3})*(?:k)?)/i,
    /€(\d{1,3}(?:,\d{3})*(?:k)?)\s*to\s*€(\d{1,3}(?:,\d{3})*(?:k)?)/i,
    /€(\d{1,3}(?:,\d{3})*(?:k)?)\s*per\s*(?:month|year)/i
  ];
  
  for (const pattern of salaryPatterns) {
    const match = description.match(pattern);
    if (match) {
      return match[0];
    }
  }
  
  return 'Competitive';
}

function determineCompanySize(company: string): string {
  // This would ideally be enhanced with actual company data
  const largeCompanies = ['google', 'microsoft', 'amazon', 'meta', 'apple', 'netflix'];
  const startupKeywords = ['startup', 'scale-up', 'early-stage'];
  
  const companyLower = company.toLowerCase();
  
  if (largeCompanies.some(large => companyLower.includes(large))) {
    return 'enterprise';
  }
  
  return 'scaleup'; // Default assumption
}

function calculateRemoteFlexibility(description: string, workEnvironment?: string | null): number {
  let score = 5; // Base score
  
  if (workEnvironment === 'remote') score = 10;
  else if (workEnvironment === 'hybrid') score = 7;
  else if (workEnvironment === 'on-site') score = 3;
  
  // Check description for remote keywords
  if (description.includes('remote') || description.includes('work from home')) {
    score = Math.max(score, 8);
  }
  
  return score;
}

function calculateGrowthPotential(description: string, company: string): number {
  let score = 5; // Base score
  
  const growthKeywords = [
    'growth', 'scale', 'expand', 'innovative', 'cutting-edge',
    'fast-paced', 'dynamic', 'startup', 'scale-up'
  ];
  
  const text = `${description} ${company}`.toLowerCase();
  const keywordCount = growthKeywords.filter(keyword => text.includes(keyword)).length;
  
  score += keywordCount;
  
  return Math.min(10, score);
}

function calculateCulturalFit(description: string): number {
  let score = 5; // Base score
  
  const cultureKeywords = [
    'diverse', 'inclusive', 'collaborative', 'team-oriented',
    'flexible', 'autonomous', 'creative', 'innovative'
  ];
  
  const keywordCount = cultureKeywords.filter(keyword => 
    description.includes(keyword)
  ).length;
  
  score += keywordCount * 0.5;
  
  return Math.min(10, score);
}

function calculateSkillAlignment(description: string, title: string): number {
  // This would be enhanced with actual skill matching
  const techSkills = [
    'javascript', 'python', 'react', 'node', 'typescript',
    'sql', 'aws', 'docker', 'kubernetes', 'git'
  ];
  
  const text = `${description} ${title}`.toLowerCase();
  const skillCount = techSkills.filter(skill => text.includes(skill)).length;
  
  return Math.min(10, skillCount * 2);
}

function calculateLocationScore(location: string): number {
  // EU cities get higher scores
  const euCities = [
    'london', 'berlin', 'amsterdam', 'paris', 'madrid',
    'zurich', 'copenhagen', 'stockholm', 'dublin', 'vienna'
  ];
  
  const locationLower = location.toLowerCase();
  
  if (euCities.some(city => locationLower.includes(city))) {
    return 8;
  }
  
  return 5; // Base score for other locations
}

function calculateTimingScore(postedAt: string | null): number {
  if (!postedAt) return 5;
  
  const postedDate = new Date(postedAt);
  const now = new Date();
  const daysSincePosted = (now.getTime() - postedDate.getTime()) / (1000 * 60 * 60 * 24);
  
  if (daysSincePosted < 1) return 10; // Very fresh
  if (daysSincePosted < 3) return 8;  // Fresh
  if (daysSincePosted < 7) return 6;  // Recent
  if (daysSincePosted < 14) return 4; // Older
  
  return 2; // Stale
}


// ================================
// EXTRACTION UTILITIES
// ================================

export function extractPostingDate(
  html: string, 
  source: string, 
  fallback: string = new Date().toISOString()
): string {
  if (!html || typeof html !== 'string') {
    return fallback;
  }

  // Common date patterns
  const datePatterns = [
    // ISO format
    /(\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(?:\.\d{3})?Z?)/,
    // European format
    /(\d{1,2}\/\d{1,2}\/\d{4})/,
    // US format
    /(\d{1,2}\/\d{1,2}\/\d{4})/,
    // Relative dates
    /(?:posted|published|updated)\s+(?:on\s+)?(\d{1,2}\s+\w+\s+\d{4})/i,
    /(\d{1,2}\s+\w+\s+\d{4})/,
  ];

  for (const pattern of datePatterns) {
    const match = html.match(pattern);
    if (match) {
      try {
        const dateStr = match[1];
        const parsedDate = new Date(dateStr);
        if (!isNaN(parsedDate.getTime())) {
          return parsedDate.toISOString();
        }
      } catch (error) {
        // Continue to next pattern
      }
    }
  }

  return fallback;
}

export function extractProfessionalExpertise(jobTitle: string, description: string): string {
  const combinedText = `${jobTitle} ${description}`.toLowerCase();
  
  const expertiseMap: Record<string, string> = {
    'software': 'Software Development',
    'frontend': 'Frontend Development',
    'backend': 'Backend Development',
    'fullstack': 'Full-Stack Development',
    'data': 'Data Science',
    'analytics': 'Data Analytics',
    'machine learning': 'Machine Learning',
    'ai': 'Artificial Intelligence',
    'devops': 'DevOps',
    'cloud': 'Cloud Engineering',
    'mobile': 'Mobile Development',
    'product': 'Product Management',
    'design': 'Design',
    'marketing': 'Marketing',
    'sales': 'Sales',
    'finance': 'Finance',
    'hr': 'Human Resources',
    'operations': 'Operations'
  };

  for (const [keyword, expertise] of Object.entries(expertiseMap)) {
    if (combinedText.includes(keyword)) {
      return expertise;
    }
  }

  return 'General';
}

export function extractCareerPath(jobTitle: string, description: string): string {
  const combinedText = `${jobTitle} ${description}`.toLowerCase();
  
  const careerPathMap: Record<string, string> = {
    'software engineer': 'tech',
    'developer': 'tech',
    'programmer': 'tech',
    'data scientist': 'data',
    'data analyst': 'data',
    'product manager': 'product',
    'designer': 'design',
    'marketing': 'marketing',
    'sales': 'sales',
    'finance': 'finance',
    'consultant': 'consulting',
    'analyst': 'analytics'
  };

  for (const [keyword, path] of Object.entries(careerPathMap)) {
    if (combinedText.includes(keyword)) {
      return path;
    }
  }

  return 'general';
}

export function extractStartDate(description: string): string {
  if (!description || typeof description !== 'string') {
    return 'TBD';
  }

  const startDatePatterns = [
    /start(?:ing)?\s+(?:date|from)?\s*:?\s*(\d{1,2}\/\d{1,2}\/\d{4})/i,
    /available\s+(?:from|starting)?\s*:?\s*(\d{1,2}\/\d{1,2}\/\d{4})/i,
    /immediate\s+start/i,
    /asap/i,
    /flexible\s+start/i
  ];

  for (const pattern of startDatePatterns) {
    const match = description.match(pattern);
    if (match) {
      if (match[1]) {
        try {
          const date = new Date(match[1]);
          if (!isNaN(date.getTime())) {
            return date.toISOString().split('T')[0];
          }
        } catch (error) {
          // Continue to next pattern
        }
      } else {
        // Immediate start keywords
        return 'immediate';
      }
    }
  }

  return 'TBD';
}