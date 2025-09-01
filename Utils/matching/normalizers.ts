/**
 * Data Normalization Utilities for JobPing Matching System
 * 
 * This file contains all normalization functions for converting and standardizing
 * data formats. Initially re-exports from jobMatching.ts, then will be migrated
 * here for better organization.
 */

// Re-export existing normalization functions from jobMatching.ts
// TODO: After testing, move implementations here
// Import functions from jobMatching
import { 
  toStringArray,
  toOptString,
  toWorkEnv,
  reqString,
  reqFirst,
  normalizeUser,
  normalizeCategoriesForRead,
  mapCategories,
  mapCities,
} from '../jobMatching';

// Re-export all functions
export { 
  toStringArray,
  toOptString,
  toWorkEnv,
  reqString,
  reqFirst,
  normalizeUser,
  normalizeCategoriesForRead,
  mapCategories,
  mapCities,
};

// Additional normalization utilities
export function normalizeEmail(email: unknown): string {
  if (typeof email === 'string') {
    return email.toLowerCase().trim();
  }
  throw new Error('Email must be a string');
}

export function normalizeCareerPath(careerPath: unknown): string {
  if (typeof careerPath === 'string') {
    return careerPath.toLowerCase().trim();
  }
  if (Array.isArray(careerPath)) {
    return careerPath[0]?.toLowerCase().trim() || 'general';
  }
  return 'general';
}

export function normalizeLocation(location: unknown): string[] {
  if (typeof location === 'string') {
    return [location.toLowerCase().trim()];
  }
  if (Array.isArray(location)) {
    return location
      .filter((loc): loc is string => typeof loc === 'string')
      .map(loc => loc.toLowerCase().trim());
  }
  return [];
}

export function normalizeCompanyType(companyType: unknown): string[] {
  if (typeof companyType === 'string') {
    return [companyType.toLowerCase().trim()];
  }
  if (Array.isArray(companyType)) {
    return companyType
      .filter((type): type is string => typeof type === 'string')
      .map(type => type.toLowerCase().trim());
  }
  return [];
}

export function normalizeRole(role: unknown): string[] {
  if (typeof role === 'string') {
    return [role.toLowerCase().trim()];
  }
  if (Array.isArray(role)) {
    return role
      .filter((r): r is string => typeof r === 'string')
      .map(r => r.toLowerCase().trim());
  }
  return [];
}

export function normalizeLanguage(language: unknown): string[] {
  if (typeof language === 'string') {
    return [language.toLowerCase().trim()];
  }
  if (Array.isArray(language)) {
    return language
      .filter((lang): lang is string => typeof lang === 'string')
      .map(lang => lang.toLowerCase().trim());
  }
  return [];
}

export function normalizeWorkEnvironment(env: unknown): string {
  if (typeof env === 'string') {
    const normalized = env.toLowerCase().trim();
    if (['remote', 'hybrid', 'office', 'onsite'].includes(normalized)) {
      return normalized;
    }
  }
  return 'unclear';
}

export function normalizeVisaStatus(status: unknown): string {
  if (typeof status === 'string') {
    const normalized = status.toLowerCase().trim();
    if (['eu citizen', 'uk citizen', 'visa required', 'sponsorship available'].includes(normalized)) {
      return normalized;
    }
  }
  return 'unknown';
}

export function normalizeStartDate(date: unknown): string | null {
  if (typeof date === 'string') {
    const trimmed = date.trim();
    if (trimmed) {
      // Basic date validation
      const parsed = new Date(trimmed);
      if (!isNaN(parsed.getTime())) {
        return trimmed;
      }
    }
  }
  return null;
}

export function normalizeEntryLevel(level: unknown): string {
  if (typeof level === 'string') {
    const normalized = level.toLowerCase().trim();
    if (['graduate', 'entry', 'junior', 'mid', 'senior'].includes(normalized)) {
      return normalized;
    }
  }
  return 'entry';
}

// Batch normalization for user preferences
export function normalizeUserPreferences(userData: Record<string, unknown>): {
  email: string;
  full_name?: string;
  professional_expertise?: string;
  visa_status: string;
  start_date?: string;
  work_environment: string;
  languages_spoken: string[];
  company_types: string[];
  roles_selected: string[];
  career_path: string;
  entry_level_preference: string;
  target_cities: string[];
} {
  return {
    email: normalizeEmail(userData.email),
    full_name: toOptString(userData.full_name),
    professional_expertise: toOptString(userData.professional_expertise),
    visa_status: normalizeVisaStatus(userData.visa_status),
    start_date: normalizeStartDate(userData.start_date),
    work_environment: normalizeWorkEnvironment(userData.work_environment),
    languages_spoken: normalizeLanguage(userData.languages_spoken),
    company_types: normalizeCompanyType(userData.company_types),
    roles_selected: normalizeRole(userData.roles_selected),
    career_path: normalizeCareerPath(userData.career_path),
    entry_level_preference: normalizeEntryLevel(userData.entry_level_preference),
    target_cities: normalizeLocation(userData.target_cities),
  };
}

// Job data normalization
export function normalizeJobData(jobData: Record<string, unknown>): {
  title: string;
  company: string;
  job_url: string;
  categories: string[];
  location: string[];
  description?: string;
  salary_min?: number;
  salary_max?: number;
  created_at?: string;
} {
  return {
    title: reqString(jobData.title),
    company: reqString(jobData.company),
    job_url: reqString(jobData.job_url),
    categories: toStringArray(jobData.categories),
    location: toStringArray(jobData.location),
    description: toOptString(jobData.description),
    salary_min: typeof jobData.salary_min === 'number' ? jobData.salary_min : undefined,
    salary_max: typeof jobData.salary_max === 'number' ? jobData.salary_max : undefined,
    created_at: toOptString(jobData.created_at),
  };
}

// Validation helpers
export function isValidEmail(email: string): boolean {
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return emailRegex.test(email);
}

export function isValidUrl(url: string): boolean {
  try {
    new URL(url);
    return true;
  } catch {
    return false;
  }
}

export function isValidDate(date: string): boolean {
  const parsed = new Date(date);
  return !isNaN(parsed.getTime());
}

// Sanitization helpers
export function sanitizeString(input: unknown): string {
  if (typeof input === 'string') {
    return input.trim().replace(/[<>]/g, '');
  }
  return '';
}

export function sanitizeArray(input: unknown): string[] {
  if (Array.isArray(input)) {
    return input
      .filter((item): item is string => typeof item === 'string')
      .map(sanitizeString)
      .filter(Boolean);
  }
  return [];
}

// Export type for normalization functions
export type NormalizerFunction<T> = (input: unknown) => T;
